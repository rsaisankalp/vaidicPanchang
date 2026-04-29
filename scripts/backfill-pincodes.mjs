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

async function nominatim(q) {
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`;
    const res = await fetch(u, { headers: { "User-Agent": "vaidicPanchang-backfill/1.0" } });
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

// Try several increasingly broad queries.
async function geocodeRow(row) {
  const venue = (row.event_venue || "").trim();
  const city = (row.event_city || "").trim();
  const state = (row.event_state || "").trim();
  const district = (row.event_district || "").trim();

  // 1. Look for a 6-digit pincode embedded in venue/city
  const pinMatch = `${venue} ${city}`.match(/\b(\d{6})\b/);
  if (pinMatch) {
    const pin = pinMatch[1];
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (r.ok) {
      const j = await r.json();
      const po = j?.[0]?.PostOffice?.[0];
      if (po) {
        // Resolve coords for the post office's place
        const geo = await nominatim(`${po.Name}, ${po.District}, ${po.State}, India`);
        if (geo) return { lat: geo.lat, lng: geo.lng, pincode: pin };
      }
    }
    await sleep(SLEEP_MS);
  }

  // 2. Direct nominatim — venue + city + state
  const queries = [
    [venue, city, state, "India"],
    [city, district, state, "India"],
    [city, state, "India"],
    [district, state, "India"],
    [state, "India"],
  ].map(parts => parts.filter(Boolean).join(", ")).filter(Boolean);

  for (const q of queries) {
    const g = await nominatim(q);
    await sleep(SLEEP_MS);
    if (g) return g;
  }

  // 3. Gemini-normalised place
  const norm = await gemini(`Indian event venue:\nvenue: ${venue}\ncity: ${city}\ndistrict: ${district}\nstate: ${state}\nReturn ONE line "City, State, India" most likely to geocode. If unknown, output UNKNOWN.`);
  if (norm && norm !== "UNKNOWN") {
    const g = await nominatim(norm.split("\n")[0]);
    await sleep(SLEEP_MS);
    if (g) return g;
  }

  // 4. Pincode via Gemini fallback
  if (city && state) {
    const pin = await gemini(`Indian postal address: "${[venue, city, district, state].filter(Boolean).join(", ")}"\nOutput ONLY the 6-digit Indian PIN. If unknown output UNKNOWN.`);
    if (pin) {
      const m = pin.match(/\b(\d{6})\b/);
      if (m) {
        const r = await fetch(`https://api.postalpincode.in/pincode/${m[1]}`);
        if (r.ok) {
          const j = await r.json();
          const po = j?.[0]?.PostOffice?.[0];
          if (po) {
            const g = await nominatim(`${po.Name}, ${po.District}, ${po.State}, India`);
            if (g) return { lat: g.lat, lng: g.lng, pincode: m[1] };
          }
        }
      }
    }
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
