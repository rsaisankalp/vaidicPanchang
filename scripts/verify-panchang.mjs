#!/usr/bin/env node
// Compares our internal /api/panchang/... TS implementation against the
// original external API. Prints per-field match/diff for several test dates.

const EXT = "https://gwala.krishnayangauraksha.org";
const INT = process.env.INTERNAL_BASE || "http://localhost:9002/api/panchang";

const COMMON = {
  "accept": "application/json, text/javascript, */*; q=0.01",
  "accept-language": "en-IN,en;q=0.9",
  "origin": EXT,
  "referer": `${EXT}/Donor/Panchang`,
  "user-agent": "Mozilla/5.0 verify",
  "x-requested-with": "XMLHttpRequest",
  "Authorization": "Basic NTZhMzU3MWU5MTgwNjc1YzBjOTkzNTBhMDc0ZDQ1NGE6OGY2OTk1ZDdlNDM3MTk5ZTcwZDVlNDFkYzAxNTg4YmI=",
};

const CASES = [
  { date: "15-08-2025", lat: "28.6139", lon: "77.2090", tz: "5.5", label: "Delhi 2025-08-15" },
  { date: "20-09-2025", lat: "12.9716", lon: "77.5946", tz: "5.5", label: "Bengaluru 2025-09-20" },
  { date: "01-01-2026", lat: "19.0760", lon: "72.8777", tz: "5.5", label: "Mumbai 2026-01-01" },
];

async function callApi(base, c, type) {
  const body = {
    birth_date_: c.date, birth_time_: "07:00:00",
    lat_: c.lat, lon_: c.lon, tzone_: c.tz,
    place_: "Test", country_: "India", state_: "Test", city_: c.lon,
    lang_: "hi", panchang_type: type, json_response: "",
    panchang_id: 0, req_frm: 0, spmode: 0,
  };
  const headers = { ...COMMON, "content-type": "application/json" };

  // Step 1: SavePanchangDetails (registers/looks up record).
  let res = await fetch(base + "/ExternalApi/SavePanchangDetails", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`save HTTP ${res.status}`);
  let data = await res.json();
  let row = data.table?.[0] || {};

  // If the record came back without computed json_data, follow up with CallPanchangAPI.
  const needFollowup = base.includes("krishnayangauraksha")
    && (!row.json_data || row.json_data.trim() === "" || row.json_data.trim() === "{}");
  if (needFollowup) {
    body.panchang_id = row.daily_panchang_id || 0;
    body.spmode = 1;
    res = await fetch(base + "/ExternalApi/CallPanchangAPI", {
      method: "POST", headers, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`call HTTP ${res.status}`);
    data = await res.json();
  }
  return data;
}

function pickFields(resp) {
  const t = resp.table?.[0] || {};
  const j = (() => { try { return JSON.parse(t.json_data || "{}"); } catch { return {}; } })();
  return {
    sunrise: t.sunrise,
    sunset: t.sunset,
    moonrise: t.moonrise,
    moonset: t.moonset,
    paksha: t.paksha,
    ritu: t.ritu,
    sun_sign: t.sun_sign,
    moon_sign: t.moon_sign,
    ayana: t.ayana,
    day_name: (t.day_name || "").trim(),
    vikram_samvat: t.vikram_samvat,
    shaka_samvat: t.shaka_samvat,
    abhijit_start: t.abhijit_muhurta_start,
    abhijit_end: t.abhijit_muhurta_end,
    rahukaal_start: t.rahukaal_start_start,
    rahukaal_end: t.rahukaal_start_end,
    tithi_number: j.tithi?.details?.tithi_number,
    tithi_name: j.tithi?.details?.tithi_name,
    nak_number: j.nakshatra?.details?.nak_number,
    nak_name: j.nakshatra?.details?.nak_name?.trim(),
    yog_number: j.yog?.details?.yog_number,
    yog_name: j.yog?.details?.yog_name,
    karan_number: j.karan?.details?.karan_number,
    karan_name: j.karan?.details?.karan_name,
    amanta: j.hindu_maah?.amanta,
    purnimanta: j.hindu_maah?.purnimanta,
  };
}

function compare(label, ext, int) {
  console.log(`\n=== ${label} ===`);
  const keys = Object.keys(ext);
  let pass = 0, fail = 0;
  for (const k of keys) {
    const e = ext[k]; const i = int[k];
    const ok = String(e).trim() === String(i).trim();
    if (ok) pass++; else fail++;
    const symbol = ok ? "✓" : "✗";
    console.log(`  ${symbol} ${k.padEnd(18)} ext=${JSON.stringify(e)}  int=${JSON.stringify(i)}`);
  }
  console.log(`  PASS=${pass}/${keys.length}  FAIL=${fail}`);
  return { pass, fail };
}

(async () => {
  let totalPass = 0, totalFail = 0;
  for (const c of CASES) {
    try {
      const [ext, int] = await Promise.all([callApi(EXT, c, "1"), callApi(INT, c, "1")]);
      const { pass, fail } = compare(c.label, pickFields(ext), pickFields(int));
      totalPass += pass; totalFail += fail;
    } catch (e) {
      console.error(c.label, "ERROR", e.message);
    }
  }
  console.log(`\n==== TOTAL PASS=${totalPass}  FAIL=${totalFail} ====`);
  process.exit(totalFail === 0 ? 0 : 1);
})();
