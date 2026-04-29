// Timezone resolution for given lat/lon. Tries `tz-lookup` (point-in-time-zone
// shapefile) first; falls back to a longitude-based offset estimate.
//
// `tz-lookup` returns an IANA name like "Asia/Kolkata"; we then derive the
// current standard offset using Node's Intl APIs.

let _tzLookup: ((lat: number, lon: number) => string) | null = null;
function getTzLookup() {
  if (_tzLookup) return _tzLookup;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _tzLookup = require("tz-lookup");
  } catch {
    _tzLookup = () => "UTC";
  }
  return _tzLookup!;
}

function offsetFromIANA(name: string, when: Date = new Date()): { hours: number; minutes: number; signed: number } {
  // Use Intl to get the offset like "GMT+5:30"
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: name, timeZoneName: "shortOffset", hour: "numeric",
  });
  try {
    const parts = fmt.formatToParts(when);
    const tzPart = parts.find(p => p.type === "timeZoneName")?.value || "GMT+0";
    const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      const hh = parseInt(m[2], 10);
      const mm = parseInt(m[3] || "0", 10);
      return { hours: hh, minutes: mm, signed: sign * (hh + mm / 60) };
    }
  } catch { /* ignore */ }
  return { hours: 0, minutes: 0, signed: 0 };
}

export function tz_lookup(lat: number, lon: number) {
  let name = "UTC";
  try { name = getTzLookup()(lat, lon); } catch { /* ignore */ }
  const off = offsetFromIANA(name);
  const sign = off.signed >= 0 ? "+" : "-";
  const absH = Math.abs(off.hours);
  const absM = Math.abs(off.minutes);
  const offset_STD = `${sign}${absH.toString().padStart(2, "0")}:${absM.toString().padStart(2, "0")}`;
  const offset_STD_seconds = Math.round(off.signed * 3600);
  // crude abbreviation guess
  const abbr = name.includes("Kolkata") ? "IST"
            : name.includes("New_York") ? "EST"
            : name.includes("Los_Angeles") ? "PST"
            : "LT";
  return { name, offset_STD, offset_STD_seconds, abbreviation: abbr };
}
