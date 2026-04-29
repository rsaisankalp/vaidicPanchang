// Wraps the swisseph-v2 native binding with Vedic defaults (Lahiri sidereal).
// Provides typed helpers for sun/moon longitudes, sunrise, moonrise, etc.

import path from "path";

// Lazy-load and configure swisseph once.
type SwissEph = any;
let swe: SwissEph | null = null;

function getSwe(): SwissEph {
  if (swe) return swe;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  swe = require("swisseph-v2");
  // Use bundled ephemeris files if present, else Moshier (always works without files).
  try {
    const ephePath = path.join(process.cwd(), "ephe");
    swe.swe_set_ephe_path(ephePath);
  } catch { /* ignore */ }
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
  return swe;
}

const SIDEREAL = () => getSwe().SEFLG_SIDEREAL | getSwe().SEFLG_SPEED | getSwe().SEFLG_MOSEPH;

export function julday(year: number, month: number, day: number, hourUT: number): number {
  const s = getSwe();
  return s.swe_julday(year, month, day, hourUT, s.SE_GREG_CAL);
}

export interface PlanetPos {
  longitude: number;     // sidereal degrees [0,360)
  longitudeSpeed: number; // deg/day
}

export function sunPos(jd: number): PlanetPos {
  const s = getSwe();
  const r = s.swe_calc_ut(jd, s.SE_SUN, SIDEREAL());
  if (r.error) throw new Error("Sun calc error: " + r.error);
  return { longitude: norm360(r.longitude), longitudeSpeed: r.longitudeSpeed };
}

export function moonPos(jd: number): PlanetPos {
  const s = getSwe();
  const r = s.swe_calc_ut(jd, s.SE_MOON, SIDEREAL());
  if (r.error) throw new Error("Moon calc error: " + r.error);
  return { longitude: norm360(r.longitude), longitudeSpeed: r.longitudeSpeed };
}

export function norm360(x: number): number {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}

// Returns sunrise/sunset/moonrise/moonset JD (UT) for the calendar date (local).
export interface RiseSetParams {
  jdStartUT: number; // search start (a JD, e.g., local midnight in UT)
  lat: number;
  lng: number;
  altitude?: number;
}

const RISE = 1;
const SET = 2;

function riseTrans(planet: number, p: RiseSetParams, type: number): number | null {
  const s = getSwe();
  const flag = type === RISE ? s.SE_CALC_RISE : s.SE_CALC_SET;
  // swisseph-v2 native binding: geopos is 3 separate positional args, not an array.
  const res = s.swe_rise_trans(
    p.jdStartUT,
    planet,
    "",
    s.SEFLG_MOSEPH,
    flag,
    p.lng,
    p.lat,
    p.altitude ?? 0,
    0,
    0,
  );
  if (res && typeof res === "object") {
    if (typeof res.transitTime === "number") return res.transitTime;
  }
  return null;
}

export function sunrise(p: RiseSetParams): number | null {
  return riseTrans(getSwe().SE_SUN, p, RISE);
}
export function sunset(p: RiseSetParams): number | null {
  return riseTrans(getSwe().SE_SUN, p, SET);
}
export function moonrise(p: RiseSetParams): number | null {
  return riseTrans(getSwe().SE_MOON, p, RISE);
}
export function moonset(p: RiseSetParams): number | null {
  return riseTrans(getSwe().SE_MOON, p, SET);
}

// Convert JD (UT) to a local clock string (HH:mm:ss) given timezone offset hours.
export function jdToLocalHMS(jd: number, tzOffsetHours: number): { h: number; m: number; s: number } {
  const s = getSwe();
  const rev = s.swe_revjul(jd, s.SE_GREG_CAL);
  // rev: { year, month, day, hour } — hour is fractional UT
  let local = rev.hour + tzOffsetHours;
  while (local >= 24) local -= 24;
  while (local < 0) local += 24;
  const h = Math.floor(local);
  const m = Math.floor((local - h) * 60);
  const sec = Math.round(((local - h) * 60 - m) * 60);
  return { h, m, s: sec };
}

export function fmtClock(h: number, m: number, s: number): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtClock12(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${m.toString().padStart(2, "0")}${ampm}`;
}
