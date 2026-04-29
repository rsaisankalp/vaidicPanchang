// Builds monthly panchang grid in the same shape as the external API:
// for each calendar day in the month, emits 4-5 rows distinguished by "sort":
//  sort=1 → tithi (tithi_name) + nakshatra (nakshatra_name)
//  sort=2 → sunrise time stuffed into tithi_name field
//  sort=3 → sunset time in tithi_name
//  sort=4 → special_event in tithi_name (or empty)

import { calculatePanchang } from "./calculator";
import { getPack } from "./i18n";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

// Per-language short paksha prefix shown in monthly grid cells.
const PAKSHA_SHORT: Record<string, [string, string]> = {
  en: ["S", "K"],
  hi: ["शु", "कृ"],
  te: ["శు", "కృ"],
  ta: ["சு", "கி"],
  ml: ["ശു", "കൃ"],
  kn: ["ಶು", "ಕೃ"],
};

export function calculateMonthlyPanchang(monthAnchor: Date, lat: number, lng: number, tz: number, language = "hi") {
  const start = startOfMonth(monthAnchor);
  const end = endOfMonth(monthAnchor);
  const days = eachDayOfInterval({ start, end });
  const rows: any[] = [];
  const pack = getPack(language);
  const [shukShort, krishShort] = PAKSHA_SHORT[language] || PAKSHA_SHORT.hi;

  for (const d of days) {
    let r;
    try {
      r = calculatePanchang({ date: d, lat, lng, tzOffsetHours: tz, language });
    } catch (e) {
      continue;
    }
    const dateName = format(d, "yyyy-MM-dd");
    const dayId = d.getDate();
    const tithiNum = r.json_data.tithi.details.tithi_number;
    const nakNum = r.json_data.nakshatra.details.nak_number;
    const isShukla = tithiNum <= 15;
    const pakshaPrefix = isShukla ? shukShort : krishShort;
    const tithiInPaksha = ((tithiNum - 1) % 15) + 1;
    const tithiShort = `${pakshaPrefix} ${tithiInPaksha}`;

    const base = {
      status: 1,
      msg: "",
      monthly_panchang_id: 0,
      day_id: dayId,
      nak: nakNum,
      tithi: tithiNum,
      sunrise: r.detail.sunrise,
      sunset: r.detail.sunset,
      date_name: dateName,
      color_code: isShukla ? "#fff" : "#eee",
    };

    rows.push({ ...base, sort: 1, tithi_name: tithiShort, nakshatra_name: r.json_data.nakshatra.details.nak_name + " " });
    rows.push({ ...base, sort: 2, tithi_name: r.detail.sunrise, nakshatra_name: "" });
    rows.push({ ...base, sort: 3, tithi_name: r.detail.sunset, nakshatra_name: "" });
    rows.push({ ...base, sort: 4, tithi_name: "", nakshatra_name: "" });
  }

  return rows;
}
