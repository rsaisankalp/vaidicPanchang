#!/usr/bin/env node
// End-to-end smoke test against the live deployment.

const BASE = process.env.LIVE_BASE || "https://panchang.vaidicpujas.in";
let pass = 0, fail = 0;
function ok(name, cond, extra = "") { (cond ? pass++ : fail++); console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`); }

async function jget(url) { const r = await fetch(url); return { code: r.status, json: r.ok ? await r.json() : null, text: r.ok ? null : await r.text() }; }
async function jpost(url, body) { const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return { code: r.status, json: r.ok ? await r.json() : null }; }

(async () => {
  console.log(`# Smoke against ${BASE}\n`);

  // Pages
  ok("/ returns 200", (await fetch(BASE + "/")).status === 200);
  ok("/calendar returns 200", (await fetch(BASE + "/calendar")).status === 200);
  ok("/classic returns 200", (await fetch(BASE + "/classic")).status === 200);

  // Reverse-geocode
  const geo = await jpost(BASE + "/api/panchang/Donor/get_Place_by_lat_log", { latitude: "28.6139", longitude: "77.2090" });
  ok("reverse-geocode Delhi", geo.code === 200 && geo.json?.results?.[0]?.country_code === "IN");

  // Panchang in 6 langs
  for (const lang of ["en", "hi", "te", "ta", "ml", "kn"]) {
    const r = await jpost(BASE + "/api/panchang/ExternalApi/SavePanchangDetails", {
      birth_date_: "15-08-2025", birth_time_: "07:00:00",
      lat_: "28.6139", lon_: "77.2090", tzone_: "5.5",
      panchang_type: "1", lang_: lang,
    });
    const t = r.json?.table?.[0];
    const j = t ? JSON.parse(t.json_data || "{}") : {};
    ok(`panchang ${lang}`,
      r.code === 200 && t?.day_name && j?.tithi?.details?.tithi_number === 22 && j?.nakshatra?.details?.nak_number === 1,
      `→ ${t?.day_name} | ${t?.paksha} | ${j?.tithi?.details?.tithi_name}`);
  }

  // Monthly panchang
  const monthly = await jpost(BASE + "/api/panchang/ExternalApi/SavePanchangDetails", {
    birth_date_: "01-12-2025", birth_time_: "07:00:00",
    lat_: "12.9716", lon_: "77.5946", tzone_: "5.5", panchang_type: "2", lang_: "hi",
  });
  ok("monthly panchang", monthly.code === 200 && (monthly.json?.table?.length ?? 0) > 60, `rows=${monthly.json?.table?.length}`);

  // Pujas (Bengaluru, Dec 2025)
  const pujas = await jget(BASE + "/api/pujas?lat=12.97&lng=77.59&from=2025-12-01&to=2026-01-31&max=20");
  ok("pujas list returns >0", pujas.code === 200 && (pujas.json?.count ?? 0) > 0,
     pujas.json?.pujas?.[0] ? `nearest: ${pujas.json.pujas[0].display_name} (${pujas.json.pujas[0].distance_km} km)` : "");

  // Event types
  const types = await jpost(BASE + "/api/panchang/Donor/GetEventTypeList", { event_id: "0", spmode: "0" });
  ok("event types list", types.code === 200 && Array.isArray(types.json) && types.json.length > 10);

  console.log(`\n${"=".repeat(40)}\nPASS=${pass}  FAIL=${fail}\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
