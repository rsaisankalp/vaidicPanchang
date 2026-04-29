// Core Panchang calculations producing the response shape consumed by
// vaidicPanchang's frontend. Mirrors gwala.krishnayangauraksha.org schema.

import {
  julday, sunPos, moonPos, sunrise as sweSunrise, sunset as sweSunset,
  moonrise as sweMoonrise, moonset as sweMoonset, jdToLocalHMS, fmtClock, fmtClock12,
  norm360,
} from "./swisseph-helpers";
import { karanaUniqueNumber } from "./constants";
import { getPack } from "./i18n";
import type { LangCode } from "./i18n";

const NAK_SIZE = 360 / 27; // 13.3333...
const TITHI_SIZE = 12;
const KARANA_SIZE = 6;
const YOGA_SIZE = 360 / 27;

export interface CalcInput {
  date: Date;        // calendar date (any time on the date is fine; we use 12:00 local)
  lat: number;
  lng: number;
  tzOffsetHours: number; // e.g. 5.5
  language?: LangCode | string;
}

export interface PanchangResult {
  // Mirror json_data shape used by frontend (ParsedJsonData)
  json_data: any;
  // Top-level DailyPanchangDetail fields
  detail: any;
  // Side tables
  table1: any[]; // karan
  table2: any[]; // nakshatra
  table3: any[]; // tithi
  table4: any[]; // yog
  table5: any[]; // hindu_maah
}

// JD for local midnight, expressed in UT.
function localMidnightUT(date: Date, tz: number): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // local midnight UT = JD(date, hour=0) - tz/24
  const jd0Local = julday(y, m, d, 0);
  return jd0Local - tz / 24;
}

// Sub-element end-time: when does (Moon-Sun)/12 cross next integer.
// Iterative search: from jdStart (UT), step forward a few minutes until index changes.
function crossingEndTime(
  jdStart: number,
  startVal: number,
  step: number,
  evalFn: (jd: number) => number,
  maxJd: number,
): number {
  let lo = jdStart;
  let hi = jdStart + step;
  // Find a coarse window where eval changed
  while (hi <= maxJd) {
    const v = evalFn(hi);
    if (Math.floor(v) > Math.floor(startVal)) {
      // bisect
      let a = lo, b = hi;
      for (let i = 0; i < 30; i++) {
        const mid = (a + b) / 2;
        const vm = evalFn(mid);
        if (Math.floor(vm) > Math.floor(startVal)) b = mid;
        else a = mid;
      }
      return (a + b) / 2;
    }
    lo = hi;
    hi = lo + step;
  }
  return maxJd;
}

function tithiIndex(jd: number): number {
  const sun = sunPos(jd).longitude;
  const moon = moonPos(jd).longitude;
  return ((moon - sun) % 360 + 360) % 360 / TITHI_SIZE;
}
function nakshatraIndex(jd: number): number {
  const moon = moonPos(jd).longitude;
  return moon / NAK_SIZE;
}
function padaForLongitude(moonLong: number): number {
  const within = (moonLong % NAK_SIZE) / (NAK_SIZE / 4);
  return Math.floor(within) + 1; // 1..4
}
function yogaIndex(jd: number): number {
  const sun = sunPos(jd).longitude;
  const moon = moonPos(jd).longitude;
  return ((sun + moon) % 360) / YOGA_SIZE;
}
function karanaIndex(jd: number): number {
  const sun = sunPos(jd).longitude;
  const moon = moonPos(jd).longitude;
  return ((moon - sun) % 360 + 360) % 360 / KARANA_SIZE;
}

// JD -> local Date (rounded to seconds) for end_time fields
function jdToLocalDate(jd: number, tz: number): Date {
  // JD UT to ms since epoch: (JD - 2440587.5) * 86400000 == ms UT
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms + tz * 3600 * 1000);
}

// Date -> { hour, minute, second } extracted from a Date interpreted as UTC clock
function dateToHMS(d: Date) {
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}

// Hindu month derivation (amanta + purnimanta). Uses solar month (Sun's rashi)
// at the new moon preceding (amanta) or full moon preceding/within (purnimanta).
// Simplified: amanta_id = sign of Sun at the most recent Amavasya, named by traditional order.
function hinduMaahIdx(jd: number): { amantaIdx: number; purnimantaIdx: number } {
  const tithiIdxNow = tithiIndex(jd);
  const daysBack = (tithiIdxNow + 1) * (29.530588 / 30);
  const amavasyaJd = jd - daysBack;
  const sunAtAmavasya = Math.floor(sunPos(amavasyaJd).longitude / 30);
  const amantaIdx = (sunAtAmavasya + 1) % 12;
  const tithiNumNow = Math.floor(tithiIdxNow);
  const purnimantaIdx = tithiNumNow >= 15 ? (amantaIdx + 1) % 12 : amantaIdx;
  return { amantaIdx, purnimantaIdx };
}

// Vikram Samvat / Shaka Samvat year switches at Chaitra Shukla Pratipada
// (around late March / early April) — not on Jan 1. We approximate the boundary
// by using April 1 as the cutoff for display purposes.
function lunarYearOffset(date: Date): number {
  const m = date.getMonth() + 1; // 1..12
  return m < 4 ? -1 : 0;
}
function vikramSamvatIdx(date: Date): { vs: number; idx: number } {
  const vs = date.getFullYear() + 57 + lunarYearOffset(date);
  return { vs, idx: ((vs - 2031) % 60 + 60) % 60 };
}
function shakaSamvatIdx(date: Date): { ss: number; idx: number } {
  const ss = date.getFullYear() - 78 + lunarYearOffset(date);
  return { ss, idx: ((ss - 1909) % 60 + 60) % 60 };
}

// Rahu-kaal, Yamghant-kaal, Guli-kaal — derived from sunrise→sunset divided into 8 parts,
// with weekday-specific muhurta numbers.
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat (1..8)
const YAMGHANT_PART = [5, 4, 3, 2, 1, 7, 6];
const GULI_PART = [7, 6, 5, 4, 3, 2, 1];

function muhurtaSegment(sunriseJd: number, sunsetJd: number, partIdx1to8: number) {
  const total = sunsetJd - sunriseJd;
  const seg = total / 8;
  const startJd = sunriseJd + seg * (partIdx1to8 - 1);
  const endJd = startJd + seg;
  return { startJd, endJd };
}

// Abhijit muhurta = 8th muhurta of day = midday-centered ~24min window (spans noon).
function abhijitWindow(sunriseJd: number, sunsetJd: number) {
  const dayLen = sunsetJd - sunriseJd;
  const muhurtaLen = dayLen / 15;
  const startJd = sunriseJd + muhurtaLen * 7;
  const endJd = startJd + muhurtaLen;
  return { startJd, endJd };
}

// Panchang yog computation (Sarvartha siddhi, Ravi yog etc.) — simplified detection.
// Ravi yog = nakshatra 4,7,10,13,16,19,22,25,1 from Sun's nakshatra.
// Sarvartha siddhi yog: specific weekday+nakshatra combos.
const SARVARTHA_NAKS_BY_WEEKDAY: Record<number, number[]> = {
  0: [3, 8, 10, 12, 21, 22], // Sun: Krittika, Pushya, Magha, Uttara P, Uttara A, Hasta
  1: [4, 7, 22, 23, 27],     // Mon: Rohini, Punarvasu, Shravana, Dhanishtha, Revati
  2: [3, 6, 23, 24],          // Tue
  3: [4, 8, 13, 23, 27],      // Wed
  4: [4, 7, 8, 22, 27],       // Thu
  5: [4, 23, 24, 27],          // Fri
  6: [4, 22, 27],               // Sat
};
function panchangYogs(weekday: number, nakNum1to27: number, lang: string): string[] {
  const yogs: string[] = [];
  const set = SARVARTHA_NAKS_BY_WEEKDAY[weekday] || [];
  const sarv: Record<string, string> = {
    en: "Sarvartha Yoga", hi: "सर्वार्थ योग", te: "సర్వార్థ యోగం",
    ta: "சர்வார்த்த யோகம்", ml: "സർവാർത്ഥ യോഗം", kn: "ಸರ್ವಾರ್ಥ ಯೋಗ",
  };
  const ravi: Record<string, string> = {
    en: "Ravi Yoga", hi: "रवि योग", te: "రవి యోగం",
    ta: "ரவி யோகம்", ml: "രവി യോഗം", kn: "ರವಿ ಯೋಗ",
  };
  if (set.includes(nakNum1to27)) yogs.push(sarv[lang] || sarv.hi);
  yogs.push(ravi[lang] || ravi.hi);
  return yogs;
}

export function calculatePanchang(input: CalcInput): PanchangResult {
  const { date, lat, lng, tzOffsetHours: tz } = input;
  const language = (input.language as string) || "hi";
  const pack = getPack(language);

  // 1) Sunrise / sunset / moonrise / moonset for the local date
  const jdMidUT = localMidnightUT(date, tz);
  const sunriseJd = sweSunrise({ jdStartUT: jdMidUT, lat, lng });
  const sunsetJd = sweSunset({ jdStartUT: jdMidUT, lat, lng });
  const moonriseJd = sweMoonrise({ jdStartUT: jdMidUT, lat, lng });
  const moonsetJd = sweMoonset({ jdStartUT: jdMidUT, lat, lng });

  if (!sunriseJd || !sunsetJd) {
    throw new Error("Could not compute sunrise/sunset");
  }

  const sr = jdToLocalHMS(sunriseJd, tz);
  const ss = jdToLocalHMS(sunsetJd, tz);
  const mr = moonriseJd ? jdToLocalHMS(moonriseJd, tz) : { h: 0, m: 0, s: 0 };
  const ms = moonsetJd ? jdToLocalHMS(moonsetJd, tz) : { h: 0, m: 0, s: 0 };

  const sunriseStr = fmtClock(sr.h, sr.m, sr.s);
  const sunsetStr = fmtClock(ss.h, ss.m, ss.s);
  const moonriseStr = moonriseJd ? fmtClock(mr.h, mr.m, mr.s) : "--:--:--";
  const moonsetStr = moonsetJd ? fmtClock(ms.h, ms.m, ms.s) : "--:--:--";

  // 2) Anchor: compute panchang at sunrise (Vedic day starts at sunrise)
  const anchorJd = sunriseJd;
  const sun = sunPos(anchorJd);
  const moon = moonPos(anchorJd);

  // Tithi
  const tithiIdxFloat = tithiIndex(anchorJd);
  const tithiNum = Math.floor(tithiIdxFloat); // 0..29
  const tithiName = pack.tithi[tithiNum];
  const paksha = tithiNum < 15 ? pack.paksha[0] : pack.paksha[1];

  // Nakshatra
  const nakIdxFloat = nakshatraIndex(anchorJd);
  const nakNum = Math.floor(nakIdxFloat); // 0..26
  const nakName = pack.nakshatra[nakNum];

  // Yoga
  const yogIdxFloat = yogaIndex(anchorJd);
  const yogNum = Math.floor(yogIdxFloat); // 0..26
  const yogName = pack.yoga[yogNum];

  // Karana
  const karIdxFloat = karanaIndex(anchorJd);
  const karNum = Math.floor(karIdxFloat); // 0..59
  const karUniqueNum = karanaUniqueNumber(karNum);
  const karName = pack.karana[karUniqueNum - 1];

  // End times
  const horizonJd = anchorJd + 2; // 2 days ahead is plenty for any sub-element transition
  const tithiEndJd = crossingEndTime(anchorJd, tithiIdxFloat, 1 / 48, tithiIndex, horizonJd);
  // Nakshatra: handle wrap at 27 → 0
  const nakEndJd = (() => {
    let lo = anchorJd;
    let hi = lo + 1 / 48;
    const startFloor = Math.floor(nakIdxFloat);
    while (hi <= horizonJd) {
      const v = nakshatraIndex(hi);
      const f = Math.floor(v);
      if (f !== startFloor) {
        let a = lo, b = hi;
        for (let i = 0; i < 30; i++) {
          const mid = (a + b) / 2;
          const fm = Math.floor(nakshatraIndex(mid));
          if (fm !== startFloor) b = mid; else a = mid;
        }
        return (a + b) / 2;
      }
      lo = hi; hi += 1 / 48;
    }
    return horizonJd;
  })();
  const yogEndJd = crossingEndTime(anchorJd, yogIdxFloat, 1 / 48, yogaIndex, horizonJd);
  const karEndJd = crossingEndTime(anchorJd, karIdxFloat, 1 / 96, karanaIndex, horizonJd);

  const tithiEndLocal = jdToLocalDate(tithiEndJd, tz);
  const nakEndLocal = jdToLocalDate(nakEndJd, tz);
  const yogEndLocal = jdToLocalDate(yogEndJd, tz);
  const karEndLocal = jdToLocalDate(karEndJd, tz);

  const tithiEndHMS = dateToHMS(tithiEndLocal);
  const nakEndHMS = dateToHMS(nakEndLocal);
  const yogEndHMS = dateToHMS(yogEndLocal);
  const karEndHMS = dateToHMS(karEndLocal);

  // 3) Vara (weekday)
  const weekday = date.getDay(); // 0=Sun
  const dayName = pack.vara[weekday];

  // 4) Sun sign / Moon sign / Ayana
  const sunSignIdx = Math.floor(sun.longitude / 30);
  const moonSignIdx = Math.floor(moon.longitude / 30);
  const sunSign = pack.rashi[sunSignIdx];
  const moonSign = pack.rashi[moonSignIdx];
  const ayana = (sunSignIdx >= 9 || sunSignIdx <= 2) ? pack.ayana[0] : pack.ayana[1];

  // 5) Hindu maah
  const maahIdx = hinduMaahIdx(anchorJd);
  const maah = {
    amanta: pack.hinduMaah[maahIdx.amantaIdx],
    purnimanta: pack.hinduMaah[maahIdx.purnimantaIdx],
    amanta_id: maahIdx.amantaIdx + 1,
    purnimanta_id: maahIdx.purnimantaIdx + 1,
    adhik_status: false,
  };

  // 6) Ritu (solar)
  const rituIdx = Math.floor(((sunSignIdx + 1) % 12) / 2);
  const ritu = pack.ritu[rituIdx];

  // 7) Samvat
  const vsObj = vikramSamvatIdx(date);
  const ssObj = shakaSamvatIdx(date);
  const vs = { vs: vsObj.vs, vsName: pack.samvatsara[vsObj.idx] };
  const ss2 = { ss: ssObj.ss, ssName: pack.samvatsara[ssObj.idx] };

  // 8) Auspicious / inauspicious windows
  const rahu = muhurtaSegment(sunriseJd, sunsetJd, RAHU_PART[weekday]);
  const yamghant = muhurtaSegment(sunriseJd, sunsetJd, YAMGHANT_PART[weekday]);
  const guli = muhurtaSegment(sunriseJd, sunsetJd, GULI_PART[weekday]);
  const abhijit = abhijitWindow(sunriseJd, sunsetJd);

  const fmt = (jd: number) => {
    const t = jdToLocalHMS(jd, tz);
    return fmtClock(t.h, t.m, t.s);
  };
  const fmtHHMM = (jd: number) => {
    const t = jdToLocalHMS(jd, tz);
    return `${t.h.toString().padStart(2, "0")}:${t.m.toString().padStart(2, "0")}`;
  };

  // Disha shool & moon nivas
  const dishaShool = pack.dishaShool[weekday];
  const moonNivasStr = pack.moonNivas[Math.floor((moon.longitude % 360) / 90) % 4];

  // Panchang yogs
  const yogs = panchangYogs(weekday, nakNum + 1, language);
  const panchangYogStr = " " + yogs.join(", ");

  // Format month_name like "August 15,2025"
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const month_name = `${months[date.getMonth()]} ${date.getDate()},${date.getFullYear()}`;

  // Compose json_data
  const json_data = {
    day: dayName,
    sunrise: `${sr.h}:${sr.m}:${sr.s}`,
    sunset: `${ss.h}:${ss.m}:${ss.s}`,
    moonrise: moonriseJd ? `${mr.h}:${mr.m}:${mr.s}` : "0:0:0",
    moonset: moonsetJd ? `${ms.h}:${ms.m}:${ms.s}` : "0:0:0",
    vedic_sunrise: `${sr.h}:${(sr.m + 4) % 60}:${sr.s}`, // approx +4 min for vedic conv
    vedic_sunset: `${ss.h}:${(ss.m - 4 + 60) % 60}:${ss.s}`,
    tithi: {
      details: {
        tithi_number: tithiNum + 1,
        tithi_name: tithiName,
        special: "",
        summary: pack.tithiSummary[tithiNum],
        deity: pack.tithiDeity[tithiNum],
      },
      end_time: { hour: tithiEndHMS.hour, minute: tithiEndHMS.minute, second: tithiEndHMS.second },
      end_time_ms: tithiEndLocal.getTime(),
    },
    nakshatra: {
      details: {
        nak_number: nakNum + 1,
        nak_name: nakName,
        pada: padaForLongitude(moon.longitude),
        ruler: pack.nakshatraRuler[nakNum],
        deity: pack.nakshatraDeity[nakNum],
        special: pack.nakshatraSpecial[nakNum],
        summary: pack.nakshatraSummary[nakNum],
      },
      end_time: { hour: nakEndHMS.hour, minute: nakEndHMS.minute, second: nakEndHMS.second },
      end_time_ms: nakEndLocal.getTime(),
    },
    yog: {
      details: {
        yog_number: yogNum + 1,
        yog_name: yogName,
        special: pack.yogaSpecial[yogNum],
        meaning: pack.yogaMeaning[yogNum],
      },
      end_time: { hour: yogEndHMS.hour, minute: yogEndHMS.minute, second: yogEndHMS.second },
      end_time_ms: yogEndLocal.getTime(),
    },
    karan: {
      details: {
        karan_number: karUniqueNum,
        karan_name: karName,
        special: pack.karanaSpecial[karUniqueNum - 1] || "",
        deity: pack.karanaDeity[karUniqueNum - 1] || "",
      },
      end_time: { hour: karEndHMS.hour, minute: karEndHMS.minute, second: karEndHMS.second },
      end_time_ms: karEndLocal.getTime(),
    },
    hindu_maah: {
      adhik_status: maah.adhik_status,
      purnimanta: maah.purnimanta,
      amanta: maah.amanta,
      amanta_id: maah.amanta_id,
      purnimanta_id: maah.purnimanta_id,
    },
    paksha,
    ritu,
    sun_sign: sunSign,
    moon_sign: moonSign,
    ayana,
    panchang_yog: panchangYogStr,
    vikram_samvat: vs.vs,
    shaka_samvat: ss2.ss,
    vkram_samvat_name: vs.vsName,
    shaka_samvat_name: ss2.ssName,
    disha_shool: dishaShool,
    disha_shool_remedies: "-",
    nak_shool: { direction: "none", remedies: "-" },
    moon_nivas: moonNivasStr,
    abhijit_muhurta: { start: fmtHHMM(abhijit.startJd), end: fmtHHMM(abhijit.endJd) },
    rahukaal: { start: fmt(rahu.startJd), end: fmt(rahu.endJd) },
    guliKaal: { start: fmt(guli.startJd), end: fmt(guli.endJd) },
    yamghant_kaal: { start: fmt(yamghant.startJd), end: fmt(yamghant.endJd) },
  };

  // External-API end-time format: "Aug 15 2025 11:51PM"
  const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtEnd = (d: Date) => {
    const mo = monthsShort[d.getUTCMonth()];
    const day = d.getUTCDate();
    const h12 = d.getUTCHours() % 12 === 0 ? 12 : d.getUTCHours() % 12;
    const ampm = d.getUTCHours() >= 12 ? "PM" : "AM";
    const mm = d.getUTCMinutes().toString().padStart(2, "0");
    return `${mo} ${day} ${d.getUTCFullYear()} ${h12.toString().padStart(2," ")}:${mm}${ampm}`;
  };

  const detail = {
    status: 1,
    msg: "calculated",
    month_name,
    festive_name: "",
    notification_button_exists: 0,
    daily_panchang_id: 0,
    year_id: date.getFullYear(),
    month_id: date.getMonth() + 1,
    lati: lat.toString(),
    long: lng.toString(),
    tzone: tz.toString(),
    country: "",
    state: "",
    city: "",
    place: "",
    day_id: date.getDate(),
    day_name: dayName,
    sunrise: fmtClock12(sr.h, sr.m),
    sunset: fmtClock12(ss.h, ss.m),
    moonrise: moonriseJd ? fmtClock12(mr.h, mr.m) : "--:--",
    moonset: moonsetJd ? fmtClock12(ms.h, ms.m) : "--:--",
    paksha,
    ritu,
    sun_sign: sunSign,
    moon_sign: moonSign,
    ayana,
    panchang_yog: panchangYogStr,
    vikram_samvat: vs.vs.toString(),
    shaka_samvat: ss2.ss.toString(),
    shaka_samvat_name: ss2.ssName,
    vkram_samvat_name: vs.vsName,
    disha_shool: dishaShool,
    nak_shool: " Direction :none Remedies : -",
    moon_nivas: moonNivasStr,
    abhijit_muhurta_start: fmtHHMM(abhijit.startJd),
    abhijit_muhurta_end: fmtHHMM(abhijit.endJd),
    rahukaal_start_start: fmt(rahu.startJd),
    rahukaal_start_end: fmt(rahu.endJd),
    guliKaal_start: fmt(guli.startJd),
    guliKaal_end: fmt(guli.endJd),
    yamghant_kaal_start: fmt(yamghant.startJd),
    yamghant_kaal_end: fmt(yamghant.endJd),
    created_datetime: new Date().toISOString().replace("Z", ""),
    language_val: language,
    status_id: true,
    req_frm: 0,
    json_data: JSON.stringify(json_data),
    tithi_end_date_time: fmtEnd(tithiEndLocal),
    nakshatra_end_date_time: fmtEnd(nakEndLocal),
    yog_end_date_time: fmtEnd(yogEndLocal),
    karan_end_date_time: fmtEnd(karEndLocal),
    hr: 0,
    min: 0,
  };

  // Side tables
  const table1 = [{
    daily_panchang_karan_id: 0, daily_panchang_id: 0,
    karan_number: karUniqueNum, karan_name: karName,
    special: pack.karanaSpecial[karUniqueNum - 1] || "", deity: pack.karanaDeity[karUniqueNum - 1] || "",
    end_time_hour: karEndHMS.hour, end_time_minute: karEndHMS.minute, end_time_second: karEndHMS.second,
  }];
  const table2 = [{
    daily_panchang_nakshatra_id: 0, daily_panchang_id: 0,
    nak_number: nakNum + 1, nak_name: nakName, ruler: pack.nakshatraRuler[nakNum],
    special: pack.nakshatraSpecial[nakNum], summary: pack.nakshatraSummary[nakNum], deity: pack.nakshatraDeity[nakNum],
    end_time_hour: nakEndHMS.hour, end_time_minute: nakEndHMS.minute, end_time_second: nakEndHMS.second,
  }];
  const table3 = [{
    daily_panchang_tithi_id: 0, daily_panchang_id: 0,
    tithi_number: tithiNum + 1, tithi_name: tithiName,
    special: "", summary: pack.tithiSummary[tithiNum], deity: pack.tithiDeity[tithiNum],
    end_time_hour: tithiEndHMS.hour, end_time_minute: tithiEndHMS.minute, end_time_second: tithiEndHMS.second,
    thithi_id: tithiNum + 1,
  }];
  const table4 = [{
    daily_panchang_yog_id: 0, daily_panchang_id: 0,
    yog_number: yogNum + 1, yog_name: yogName, special: pack.yogaSpecial[yogNum], summary: pack.yogaMeaning[yogNum],
    end_time_hour: yogEndHMS.hour, end_time_minute: yogEndHMS.minute, end_time_second: yogEndHMS.second,
  }];
  const table5 = [{
    daily_panchang_hindu_maah_id: 0, daily_panchang_id: 0,
    adhik_status: maah.adhik_status.toString(),
    purnimanta: maah.purnimanta, amanta: maah.amanta,
    amanta_id: maah.amanta_id.toString(), purnimanta_id: maah.purnimanta_id.toString(),
  }];

  return { json_data, detail, table1, table2, table3, table4, table5 };
}
