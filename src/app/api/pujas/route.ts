import { NextRequest, NextResponse } from "next/server";
import { getNearbyPujas } from "@/lib/panchang/pujas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Strip ASCII control characters (some wa_events rows have literal newlines /
// tabs in `swamiji_details` or `event_venue`, which break JSON parsing in
// browsers). Compress remaining whitespace.
function clean(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim();
}

// Short-lived in-process cache. Pujas data only changes on the half-hourly
// backfill cron, so 5-minute cache hits are safe and make repeat date clicks
// instant.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ts: number; payload: any }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const fromDate = searchParams.get("from") || undefined;
  const toDate = searchParams.get("to") || undefined;
  const city = searchParams.get("city") || undefined;
  const state = searchParams.get("state") || undefined;
  const radius = parseFloat(searchParams.get("radius") || "");
  const max = parseInt(searchParams.get("max") || "200", 10);

  // Round lat/lng to 2dp so neighbouring requests share a cache slot.
  const latKey = Number.isFinite(lat) ? lat.toFixed(2) : "";
  const lngKey = Number.isFinite(lng) ? lng.toFixed(2) : "";
  const radKey = Number.isFinite(radius) ? String(radius) : "";
  const cacheKey = `${latKey}|${lngKey}|${fromDate}|${toDate}|${city}|${state}|${radKey}|${max}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json(hit.payload, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60", "X-Cache": "HIT" },
    });
  }

  const list = await getNearbyPujas({
    fromDate, toDate,
    userLat: Number.isFinite(lat) ? lat : undefined,
    userLng: Number.isFinite(lng) ? lng : undefined,
    city, state,
    radiusKm: Number.isFinite(radius) ? radius : undefined,
    maxResults: Number.isFinite(max) ? max : 200,
  });

  const sanitised = list.map((p) => {
    const out: any = { ...p };
    for (const k of Object.keys(out)) {
      if (typeof out[k] === "string") out[k] = clean(out[k]);
    }
    return out;
  });

  const payload = { pujas: sanitised, count: sanitised.length };
  cache.set(cacheKey, { ts: Date.now(), payload });
  // Evict old entries opportunistically.
  if (cache.size > 200) {
    const cutoff = Date.now() - CACHE_TTL_MS;
    for (const [k, v] of cache) if (v.ts < cutoff) cache.delete(k);
  }
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60", "X-Cache": "MISS" },
  });
}
