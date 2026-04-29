// Pujas: pulls upcoming events from vds_seva.wa_events and filters by proximity
// to a user-supplied lat/lng. Geocoding goes through Nominatim (cached) when
// the venue isn't already pin-coded; an optional Gemini fallback can be wired
// in by setting GEMINI_PINCODE_LOOKUP=1 (mirrors marketing.vaidicpujas.in flow).

import { sevaQuery } from "./db";
import { tz_lookup } from "./tz";
import { aiNormalizeLocation } from "./ai-geo";

export interface WaEvent {
  id: number;
  wp_event_id: number | null;
  event_name: string;
  event_type: string | null;
  sevaamt: number | null;
  event_city: string | null;
  event_state: string | null;
  event_district: string | null;
  event_venue: string | null;
  event_at: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  event_status: string | null;
  purpose: string | null;
  sub_purpose: string | null;
  swamiji_details: string | null;
  participant_count: number | null;
  repeat_frequency: string | null;
  // Augmented client-side
  lat?: number | null;
  lng?: number | null;
  distance_km?: number;
  display_name?: string;
}

export interface PujaQuery {
  fromDate?: string; // ISO yyyy-mm-dd
  toDate?: string;
  userLat?: number;
  userLng?: number;
  city?: string;
  state?: string;
  maxResults?: number;
  radiusKm?: number;
}

// In-memory cache for geocoding "City, State, India" → {lat,lng}.
const _geoCache = new Map<string, { lat: number; lng: number } | null>();

async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(u, { headers: { "User-Agent": "vaidicPanchang/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

async function geocodeVenue(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  const key = `${city}|${state}`;
  if (_geoCache.has(key)) return _geoCache.get(key) || null;

  // Pass 1: direct Nominatim
  const direct = await nominatim([city, state, "India"].filter(Boolean).join(", "));
  if (direct) { _geoCache.set(key, direct); return direct; }

  // Pass 2: ask Gemini to normalise the place name, retry Nominatim
  const normalised = await aiNormalizeLocation({ city, state });
  if (normalised) {
    const second = await nominatim(normalised);
    if (second) { _geoCache.set(key, second); return second; }
  }

  _geoCache.set(key, null);
  return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function displayName(e: WaEvent): string {
  const sub = (e.sub_purpose || "").trim();
  if (sub.length > 2) return sub;
  const full = e.event_name || "";
  const i = full.lastIndexOf(" - ");
  return i > 0 ? full.substring(i + 3).trim() : full;
}

export async function getNearbyPujas(q: PujaQuery): Promise<WaEvent[]> {
  const fromDate = q.fromDate || new Date().toISOString().slice(0, 10);
  const toDate = q.toDate; // optional upper bound
  const max = q.maxResults || 200;

  const params: any[] = [fromDate];
  let where = "(event_start_date >= $1 OR (event_start_date IS NULL AND event_at IS NULL))";
  if (toDate) { params.push(toDate); where += ` AND event_start_date <= $${params.length}`; }

  // Always restrict to public/approved, paid sevas (matches marketing flow)
  where += " AND COALESCE(purpose, '') NOT IN ('Donation')";
  where += " AND (event_status = 'Approved' OR event_status IS NULL)";

  // Optional textual location prefilter (faster + smaller working set)
  if (q.city) { params.push(`%${q.city}%`); where += ` AND (event_city ILIKE $${params.length} OR event_at ILIKE $${params.length})`; }
  if (q.state) { params.push(`%${q.state}%`); where += ` AND event_state ILIKE $${params.length}`; }

  const sql = `
    SELECT id, wp_event_id, event_name, event_type, sevaamt,
           event_city, event_state, event_district, event_venue, event_at,
           event_start_date, event_end_date, event_start_time, event_end_time,
           event_status, purpose, sub_purpose, swamiji_details,
           participant_count, repeat_frequency
    FROM wa_events
    WHERE ${where}
    ORDER BY event_start_date ASC NULLS LAST
    LIMIT ${max}
  `;
  const rows = await sevaQuery<WaEvent>(sql, params);

  // If user lat/lng supplied, geocode each unique city,state and compute distance.
  if (q.userLat != null && q.userLng != null && rows.length > 0) {
    // Geocode in parallel but cap concurrency (Nominatim rate-limits).
    const uniqueLocs = Array.from(new Set(rows.map(r => `${r.event_city || ""}|${r.event_state || ""}`)));
    const concurrency = 3;
    const lookup = new Map<string, { lat: number; lng: number } | null>();
    for (let i = 0; i < uniqueLocs.length; i += concurrency) {
      const slice = uniqueLocs.slice(i, i + concurrency);
      const results = await Promise.all(slice.map(async k => {
        const [city, state] = k.split("|");
        return [k, await geocodeVenue(city, state)] as const;
      }));
      for (const [k, v] of results) lookup.set(k, v);
    }
    const me = { lat: q.userLat, lng: q.userLng };
    for (const r of rows) {
      const k = `${r.event_city || ""}|${r.event_state || ""}`;
      const ll = lookup.get(k);
      if (ll) {
        r.lat = ll.lat; r.lng = ll.lng;
        r.distance_km = Math.round(haversineKm(me, ll));
      }
      r.display_name = displayName(r);
    }
    if (q.radiusKm != null) {
      return rows.filter(r => r.distance_km == null || r.distance_km <= q.radiusKm!)
                 .sort((a, b) => (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9));
    }
    return rows.sort((a, b) => (a.distance_km ?? 9e9) - (b.distance_km ?? 9e9));
  }

  return rows.map(r => ({ ...r, display_name: displayName(r) }));
}

// Returns pujas grouped by yyyy-mm-dd, used by the calendar UI.
export async function getPujasGroupedByDate(q: PujaQuery): Promise<Record<string, WaEvent[]>> {
  const list = await getNearbyPujas(q);
  const out: Record<string, WaEvent[]> = {};
  for (const e of list) {
    const d = e.event_start_date || "";
    if (!d) continue;
    const key = d.slice(0, 10);
    if (!out[key]) out[key] = [];
    out[key].push(e);
  }
  return out;
}
