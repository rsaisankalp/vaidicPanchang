#!/usr/bin/env node
// Backfills missing pincode + lat/lng on wa_events using:
//   1. postalpincode.in (free) — when an Indian PIN already in the address
//   2. OpenStreetMap Nominatim — geocode "City, State, India"
//   3. Gemini Flash — last-resort normalisation for messy venue names
//
// Run on the deploy host (where vds_seva is on 127.0.0.1):
//   node scripts/backfill-pincodes.mjs
// Designed to be invoked from a cron / systemd timer every 30 minutes.

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SEVA_DATABASE_URL ||
    "postgresql://marketing_user:vds_mkt_2025_secure@127.0.0.1:5432/vds_seva",
  max: 4,
});

const GOOGLE_API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean);
const GEMINI_MODEL = "gemini-2.0-flash";
const SLEEP_MS = 1100; // Nominatim rate-limit

const BATCH_SIZE = parseInt(process.env.BATCH || "50", 10);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function pickGeminiKey() {
  if (!GOOGLE_API_KEYS.length) return null;
  return GOOGLE_API_KEYS[Math.floor(Math.random() * GOOGLE_API_KEYS.length)];
}

async function gemini(prompt) {
  const key = pickGeminiKey();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const j = await res.json();
    return (j?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  } catch { return null; }
}

// Ask Gemini to return lat/lng/pincode as strict JSON.
async function geminiCoords(parts) {
  const desc = `venue: ${parts.venue || ""}\ncity: ${parts.city || ""}\ndistrict: ${parts.district || ""}\nstate: ${parts.state || ""}`;
  const prompt = `For this Indian event location, output ONLY valid JSON {"lat":<float>,"lng":<float>,"pincode":"<6 digit string or null>"}.
Use city centre coords if exact venue is unknown. If state-only is given, use state capital.
${desc}`;
  const out = await gemini(prompt);
  if (!out) return null;
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (typeof j.lat !== "number" || typeof j.lng !== "number") return null;
    if (j.lat < 6 || j.lat > 38 || j.lng < 68 || j.lng > 98) return null; // India bounds sanity
    return { lat: j.lat, lng: j.lng, pincode: typeof j.pincode === "string" && /^\d{6}$/.test(j.pincode) ? j.pincode : null };
  } catch { return null; }
}

async function nominatim(q) {
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`;
    const res = await fetch(u, { headers: { "User-Agent": "vaidicPanchang-backfill/1.0 (saket@vaidicpujas.in)" } });
    if (res.status === 429) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const r = data[0];
    return {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      pincode: r.address?.postcode || null,
    };
  } catch { return null; }
}

// Built-in coords for the most common Indian metros. Saves a round-trip and
// guarantees coverage even when both Nominatim and Gemini fail.
const CITY_COORDS = {
  "bangalore": { lat: 12.9716, lng: 77.5946 }, "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "mumbai": { lat: 19.0760, lng: 72.8777 }, "pune": { lat: 18.5204, lng: 73.8567 },
  "chennai": { lat: 13.0827, lng: 80.2707 }, "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "delhi": { lat: 28.6139, lng: 77.2090 }, "new delhi": { lat: 28.6139, lng: 77.2090 },
  "kolkata": { lat: 22.5726, lng: 88.3639 }, "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "surat": { lat: 21.1702, lng: 72.8311 }, "jaipur": { lat: 26.9124, lng: 75.7873 },
  "lucknow": { lat: 26.8467, lng: 80.9462 }, "kanpur": { lat: 26.4499, lng: 80.3319 },
  "indore": { lat: 22.7196, lng: 75.8577 }, "bhopal": { lat: 23.2599, lng: 77.4126 },
  "jamnagar": { lat: 22.4707, lng: 70.0577 }, "thrissur": { lat: 10.5276, lng: 76.2144 },
  "raipur": { lat: 21.2514, lng: 81.6296 }, "rajnandgaon": { lat: 21.0974, lng: 81.0379 },
  "kothrud": { lat: 18.5074, lng: 73.8077 }, "vasad": { lat: 22.4900, lng: 73.0700 },
  "barua sagar": { lat: 25.3833, lng: 78.7833 }, "baruasagar": { lat: 25.3833, lng: 78.7833 },
  "kurud": { lat: 20.9667, lng: 81.7000 }, "guwahati": { lat: 26.1445, lng: 91.7362 },
  "haridwar": { lat: 29.9457, lng: 78.1642 }, "rishikesh": { lat: 30.0869, lng: 78.2676 },
  "vadodara": { lat: 22.3072, lng: 73.1812 }, "varanasi": { lat: 25.3176, lng: 82.9739 },
  "patna": { lat: 25.5941, lng: 85.1376 }, "nagpur": { lat: 21.1458, lng: 79.0882 },
  "mukherjee nagar": { lat: 28.7095, lng: 77.2107 }, // Delhi
  "saket nagar": { lat: 22.7196, lng: 75.8577 }, // Indore
  "saket": { lat: 28.5244, lng: 77.2091 }, // Delhi
  "benajhawar": { lat: 23.6166, lng: 78.9316 }, // MP approximation
};

const STATE_CAPITAL_COORDS = {
  "andhra pradesh": { lat: 16.5062, lng: 80.6480 }, // Amaravati
  "arunachal pradesh": { lat: 27.0844, lng: 93.6053 }, // Itanagar
  "assam": { lat: 26.1445, lng: 91.7362 }, // Guwahati
  "bihar": { lat: 25.5941, lng: 85.1376 }, // Patna
  "chhattisgarh": { lat: 21.2514, lng: 81.6296 }, // Raipur
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "goa": { lat: 15.4909, lng: 73.8278 }, // Panaji
  "gujarat": { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
  "haryana": { lat: 28.4595, lng: 77.0266 }, // Gurgaon
  "himachal pradesh": { lat: 31.1048, lng: 77.1734 }, // Shimla
  "jharkhand": { lat: 23.3441, lng: 85.3096 }, // Ranchi
  "karnataka": { lat: 12.9716, lng: 77.5946 }, // Bangalore
  "kerala": { lat: 8.5241, lng: 76.9366 }, // TVM
  "madhya pradesh": { lat: 23.2599, lng: 77.4126 }, // Bhopal
  "maharashtra": { lat: 19.0760, lng: 72.8777 }, // Mumbai
  "manipur": { lat: 24.8170, lng: 93.9368 }, // Imphal
  "meghalaya": { lat: 25.5788, lng: 91.8933 }, // Shillong
  "mizoram": { lat: 23.7271, lng: 92.7176 }, // Aizawl
  "nagaland": { lat: 25.6747, lng: 94.1086 }, // Kohima
  "odisha": { lat: 20.2961, lng: 85.8245 }, // Bhubaneswar
  "punjab": { lat: 30.7333, lng: 76.7794 }, // Chandigarh
  "rajasthan": { lat: 26.9124, lng: 75.7873 }, // Jaipur
  "sikkim": { lat: 27.3389, lng: 88.6065 }, // Gangtok
  "tamil nadu": { lat: 13.0827, lng: 80.2707 }, // Chennai
  "telangana": { lat: 17.3850, lng: 78.4867 }, // Hyderabad
  "tripura": { lat: 23.8315, lng: 91.2868 }, // Agartala
  "uttar pradesh": { lat: 26.8467, lng: 80.9462 }, // Lucknow
  "uttarakhand": { lat: 30.3165, lng: 78.0322 }, // Dehradun
  "west bengal": { lat: 22.5726, lng: 88.3639 }, // Kolkata
};

function localLookup(parts) {
  const lc = (s) => (s || "").toLowerCase().trim();
  const tryKeys = [lc(parts.city), lc(parts.district), lc(parts.venue?.split(/[,\s]/)[0])];
  for (const k of tryKeys) {
    if (k && CITY_COORDS[k]) return { ...CITY_COORDS[k], pincode: null };
  }
  // Try every word in venue
  if (parts.venue) {
    for (const w of parts.venue.toLowerCase().split(/[\s,]+/)) {
      if (CITY_COORDS[w]) return { ...CITY_COORDS[w], pincode: null };
    }
  }
  const st = lc(parts.state);
  if (st && STATE_CAPITAL_COORDS[st]) return { ...STATE_CAPITAL_COORDS[st], pincode: null };
  return null;
}

async function geocodeRow(row) {
  const venue = (row.event_venue || "").trim();
  const city = (row.event_city || "").trim();
  const state = (row.event_state || "").trim();
  const district = (row.event_district || "").trim();
  const parts = { venue, city, district, state };

  // 1) Pincode embedded in address?
  const pinMatch = `${venue} ${city}`.match(/\b(\d{6})\b/);
  if (pinMatch) {
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pinMatch[1]}`);
      if (r.ok) {
        const j = await r.json();
        const po = j?.[0]?.PostOffice?.[0];
        if (po) {
          const local = localLookup({ city: po.Name, state: po.State });
          if (local) return { ...local, pincode: pinMatch[1] };
        }
      }
    } catch {}
  }

  // 2) Local lookup (cheap, deterministic)
  const local = localLookup(parts);
  if (local) {
    // Try Gemini for pincode (cheap call) but don't gate on it
    const g = await geminiCoords(parts);
    if (g?.pincode) local.pincode = g.pincode;
    return local;
  }

  // 3) Gemini direct coords
  const g = await geminiCoords(parts);
  if (g) return g;

  // 4) Nominatim (last resort — likely 429 from this server)
  const queries = [
    [city, district, state, "India"], [city, state, "India"], [district, state, "India"], [state, "India"],
  ].map(parts => parts.filter(Boolean).join(", ")).filter(Boolean);
  for (const q of queries) {
    const n = await nominatim(q);
    if (n) return n;
    await sleep(SLEEP_MS);
  }

  return null;
}

(async () => {
  const { rows } = await pool.query(`
    SELECT id, event_venue, event_city, event_district, event_state
    FROM wa_events
    WHERE (latitude IS NULL OR longitude IS NULL)
      AND (event_city IS NOT NULL OR event_state IS NOT NULL OR event_venue IS NOT NULL)
      AND event_start_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY event_start_date NULLS LAST
    LIMIT $1
  `, [BATCH_SIZE]);

  console.log(`[backfill] processing ${rows.length} rows`);
  let ok = 0, miss = 0;
  for (const row of rows) {
    try {
      const g = await geocodeRow(row);
      if (g) {
        await pool.query(
          `UPDATE wa_events SET latitude=$1, longitude=$2, pincode=COALESCE($3, pincode), geocoded_at=NOW() WHERE id=$4`,
          [g.lat, g.lng, g.pincode || null, row.id]
        );
        ok++;
        console.log(`✓ id=${row.id} ${row.event_city || row.event_state} → ${g.lat.toFixed(3)},${g.lng.toFixed(3)}${g.pincode ? ` pin=${g.pincode}` : ""}`);
      } else {
        // Mark as attempted to avoid re-trying every cycle
        await pool.query(`UPDATE wa_events SET geocoded_at=NOW() WHERE id=$1`, [row.id]);
        miss++;
        console.log(`✗ id=${row.id} ${row.event_city || row.event_state || "?"}`);
      }
    } catch (e) {
      console.error(`! id=${row.id}`, e.message);
    }
  }
  console.log(`[backfill] ok=${ok} miss=${miss}`);
  await pool.end();
})();
