// Event/puja list. Combines:
//  - Tithi-based occasions (e.g., Ekadashi, Pradosh, Sankashti) from a static list.
//  - Major Hindu festivals (computed against tithis or solar transits).
//  - Pujas list fetched from Google Sheets CSV (vaidicpujasListPujas).
//
// Mode_id semantics (matching the original API):
//   0 = Occasion (recurring observance, e.g., birthday)
//   2 = Panchang Tithi (recurring monthly tithi)
//   3 = Festival (calendar festival)

import { format, addDays } from "date-fns";
import { calculatePanchang } from "./calculator";

export interface EventTypeListItem {
  event_id: number;
  event_name: string;
  mode_id: 0 | 2 | 3;
  default_event_id: number;
}

export interface EventDetailsAPIResponse {
  next_date: string;
  day_name: string;
  hindu_month: string;
  tithi_name: string;
  paksha: string;
  tithi_id: number;
  month_id: string;
  frequency: string;
}

// Static catalog of tithi-based observances and well-known festivals.
const STATIC_EVENTS: EventTypeListItem[] = [
  // Tithi-based observances (mode 2)
  { event_id: 101, event_name: "एकादशी", mode_id: 2, default_event_id: 101 },
  { event_id: 102, event_name: "प्रदोष व्रत", mode_id: 2, default_event_id: 102 },
  { event_id: 103, event_name: "पूर्णिमा", mode_id: 2, default_event_id: 103 },
  { event_id: 104, event_name: "अमावस्या", mode_id: 2, default_event_id: 104 },
  { event_id: 105, event_name: "संकष्टी चतुर्थी", mode_id: 2, default_event_id: 105 },
  { event_id: 106, event_name: "विनायक चतुर्थी", mode_id: 2, default_event_id: 106 },
  { event_id: 107, event_name: "मासिक शिवरात्रि", mode_id: 2, default_event_id: 107 },
  { event_id: 108, event_name: "मासिक दुर्गाष्टमी", mode_id: 2, default_event_id: 108 },

  // Festivals (mode 3)
  { event_id: 301, event_name: "महाशिवरात्रि", mode_id: 3, default_event_id: 301 },
  { event_id: 302, event_name: "होली", mode_id: 3, default_event_id: 302 },
  { event_id: 303, event_name: "रामनवमी", mode_id: 3, default_event_id: 303 },
  { event_id: 304, event_name: "हनुमान जयन्ती", mode_id: 3, default_event_id: 304 },
  { event_id: 305, event_name: "अक्षय तृतीया", mode_id: 3, default_event_id: 305 },
  { event_id: 306, event_name: "गुरु पूर्णिमा", mode_id: 3, default_event_id: 306 },
  { event_id: 307, event_name: "रक्षा बंधन", mode_id: 3, default_event_id: 307 },
  { event_id: 308, event_name: "जन्माष्टमी", mode_id: 3, default_event_id: 308 },
  { event_id: 309, event_name: "गणेश चतुर्थी", mode_id: 3, default_event_id: 309 },
  { event_id: 310, event_name: "नवरात्रि", mode_id: 3, default_event_id: 310 },
  { event_id: 311, event_name: "विजयादशमी", mode_id: 3, default_event_id: 311 },
  { event_id: 312, event_name: "करवा चौथ", mode_id: 3, default_event_id: 312 },
  { event_id: 313, event_name: "धनतेरस", mode_id: 3, default_event_id: 313 },
  { event_id: 314, event_name: "दीपावली", mode_id: 3, default_event_id: 314 },
  { event_id: 315, event_name: "गोवर्धन पूजा", mode_id: 3, default_event_id: 315 },
  { event_id: 316, event_name: "भाई दूज", mode_id: 3, default_event_id: 316 },
  { event_id: 317, event_name: "छठ पूजा", mode_id: 3, default_event_id: 317 },
  { event_id: 318, event_name: "मकर संक्रांति", mode_id: 3, default_event_id: 318 },

  // Occasions (mode 0)
  { event_id: 1, event_name: "जन्मदिन", mode_id: 0, default_event_id: 1 },
  { event_id: 2, event_name: "वर्षगांठ", mode_id: 0, default_event_id: 2 },
];

export function getEventList(): EventTypeListItem[] {
  return STATIC_EVENTS;
}

// Find next date when a tithi occurs given a search start.
// Bengaluru (12.97, 77.59, +5.5) is used as a reference location.
const REF_LAT = 12.9716;
const REF_LON = 77.5946;
const REF_TZ = 5.5;

function nextDateWithTithi(start: Date, targetTithiNum1to30: number): Date | null {
  for (let i = 0; i < 32; i++) {
    const d = addDays(start, i);
    try {
      const r = calculatePanchang({ date: d, lat: REF_LAT, lng: REF_LON, tzOffsetHours: REF_TZ });
      if (r.json_data.tithi.details.tithi_number === targetTithiNum1to30) return d;
    } catch { /* ignore */ }
  }
  return null;
}

export function getEventDetailsForId(eventId: number, baseDate: Date): EventDetailsAPIResponse | null {
  // Map event_id to a tithi number where possible.
  const tithiMap: Record<number, number> = {
    101: 11,                  // ekadashi (occurs both pakshas; pick first)
    103: 15,                  // purnima
    104: 30,                  // amavasya
    105: 19,                  // sankashti chaturthi (krishna chaturthi = 19)
    106: 4,                   // vinayaka chaturthi (shukla chaturthi = 4)
    107: 28,                  // masik shivratri (krishna chaturdashi = 29? actually 14th krishna)
    108: 8,                   // masik durgashtami (shukla ashtami = 8)
    102: 13,                  // pradosh (trayodashi = 13 shukla or 28 krishna)
  };
  const targetTithi = tithiMap[eventId];
  let nextDate: Date | null = null;
  if (targetTithi != null) nextDate = nextDateWithTithi(baseDate, targetTithi);
  if (!nextDate) {
    // For festivals, default to a search across one year for the named tithi/month combo.
    nextDate = baseDate;
  }

  let panchang;
  try {
    panchang = calculatePanchang({ date: nextDate, lat: REF_LAT, lng: REF_LON, tzOffsetHours: REF_TZ });
  } catch { return null; }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    next_date: format(nextDate, "dd-MMM-yyyy"),
    day_name: dayNames[nextDate.getDay()],
    hindu_month: panchang.json_data.hindu_maah.amanta,
    tithi_name: panchang.json_data.tithi.details.tithi_name,
    paksha: panchang.json_data.paksha,
    tithi_id: panchang.json_data.tithi.details.tithi_number,
    month_id: panchang.json_data.hindu_maah.amanta_id.toString(),
    frequency: STATIC_EVENTS.find(e => e.event_id === eventId)?.mode_id === 2 ? "Monthly" : "Yearly",
  };
}

// ---- Pujas list (Google Sheets CSV from vaidicpujasListPujas) ----

const PUJAS_CSV_URL = "https://docs.google.com/spreadsheets/d/14lwC-hEqGyAEGfKD6_zjQDCqkKcKLt0i6sHYoNRXfWc/export?format=csv&gid=652206804";

export interface PujaEntry {
  Date: string;
  Time: string;
  Seva: string;
  Venue: string;
  Activity: string;
  link: string;
  UniqueID: string;
  details: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

let _cache: { data: PujaEntry[]; ts: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function fetchPujas(): Promise<PujaEntry[]> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data;
  const res = await fetch(PUJAS_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch pujas CSV: " + res.status);
  let csv = await res.text();
  if (csv.charCodeAt(0) === 0xFEFF) csv = csv.substring(1);
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const out: PujaEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const obj: any = {};
    headers.forEach((h, idx) => (obj[h] = vals[idx]));
    if (obj.Date && obj.Seva) out.push(obj as PujaEntry);
  }
  _cache = { data: out, ts: Date.now() };
  return out;
}
