export interface LocationAPIResponse {
  results: LocationResult[];
  query: {
    lat: number;
    lon: number;
    plus_code: string;
  };
}

export interface LocationResult {
  name?: string;
  country: string;
  country_code: string;
  state?: string;
  state_code?: string;
  county?: string;
  city?: string;
  postcode?: string;
  district?: string;
  suburb?: string;
  street?: string;
  lon: number;
  lat: number;
  formatted: string;
  address_line1: string;
  address_line2: string;
  timezone: Timezone;
  place_id: string;
}

export interface Timezone {
  name: string;
  offset_STD: string;
  offset_STD_seconds: number;
  offset_DST: string;
  offset_DST_seconds: number;
  abbreviation_STD: string;
  abbreviation_DST: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  timezoneName?: string;
  timezoneOffset?: string; // e.g., "5.5"
}

export interface MonthlyPanchangParams {
  birth_date_: string; // dd-MM-yyyy, e.g., 01-06-2025 for June 2025
  birth_time_?: string; // HH:mm:ss, default "07:00:00"
  lat_: string;
  lon_: string;
  tzone_: string; // e.g. "5.5"
  place_?: string;
  country_?: string;
  state_?: string;
  city_?: string; // API docs say city_ is lon_
  lang_?: "hi" | "en"; // default "hi"
  panchang_type: "2"; // For monthly
}

export interface MonthlyPanchangAPIResponse {
  table: MonthlyPanchangEntry[];
}

export interface MonthlyPanchangEntry {
  status: number;
  msg: string;
  monthly_panchang_id: number;
  day_id: number; // Day of the month
  nak: number;
  tithi: number;
  sunrise: string; // "5:56AM"
  sunset: string; // "6:52PM"
  tithi_name: string; // "शु -6" or sunrise/sunset time or special event
  nakshatra_name: string; // "पुष्य "
  date_name: string; // "2025-06-01"
  sort: number; // 1, 2, 3, 4, 5
  color_code: string;
}

export interface ProcessedPanchangDay {
  date: string; // "2025-06-01"
  dayOfMonth: number;
  tithi?: string; // From sort:1
  nakshatra?: string; // From sort:1
  sunrise?: string; // From sort:2 tithi_name
  sunset?: string; // From sort:3 tithi_name
  specialEvent?: string; // From sort:4 tithi_name
  fullDate: Date;
  isToday?: boolean;
  isCurrentMonth?: boolean;
}

export interface DailyPanchangParams {
  birth_date_: string; // dd-MM-yyyy
  birth_time_?: string; // HH:mm:ss, default "07:00:00"
  lat_: string;
  lon_: string;
  tzone_: string;
  place_?: string;
  country_?: string;
  state_?: string;
  city_?: string; // API docs say city_ is lon_
  lang_?: "hi" | "en";
  panchang_type: "1"; // For daily
}

export interface DailyPanchangAPIResponse {
  table: DailyPanchangDetail[];
  table1?: KaranDetail[]; // Karan
  table2?: NakshatraDetail[]; // Nakshatra
  table3?: TithiDetail[]; // Tithi
  table4?: YogDetail[]; // Yog
  table5?: HinduMaahDetail[]; // Hindu Maah
}

export interface DailyPanchangDetail {
  status: number;
  msg: string;
  month_name: string; // "June 4,2025"
  festive_name?: string; // "महेश नवमी"
  daily_panchang_id: number;
  day_name: string; // "बुधवार "
  sunrise: string; // "5:52AM"
  sunset: string; // "6:43PM"
  moonrise: string; // "1:15PM"
  moonset: string; // "12:59AM"
  paksha: string; // "शुक्ल पक्ष"
  ritu: string; // "ग्रीष्म"
  sun_sign: string; // "वृष"
  moon_sign: string; // "सिंह"
  ayana: string; // "उत्तरायण "
  panchang_yog?: string; // " रवि योग"
  vikram_samvat: string; // "2082"
  shaka_samvat: string; // "1947"
  shaka_samvat_name: string; // "विश्ववासु "
  vkram_samvat_name: string; // "कालयुक्त "
  disha_shool: string; // "उत्तर"
  nak_shool?: string; // " Direction :उत्तर Remedies : -"
  moon_nivas: string; // "पूर्व"
  abhijit_muhurta_start: string; // "11:52"
  abhijit_muhurta_end: string; // "12:42"
  rahukaal_start_start: string; // "12:17:54"
  rahukaal_start_end: string; // "13:54:17"
  guliKaal_start: string; // "10:41:32"
  guliKaal_end: string; // "12:17:54"
  yamghant_kaal_start: string; // "07:28:46"
  yamghant_kaal_end: string; // "09:05:09"
  json_data?: string; // Stringified JSON of more details
  tithi_end_date_time: string; // "Jun 4 2025 11:55PM"
  nakshatra_end_date_time: string; // "Jun 5 2025 3:36AM"
  yog_end_date_time: string; // "Jun 4 2025 8:28AM"
  karan_end_date_time: string; // "Jun 4 2025 10:53AM"
  [key: string]: any; // Allow other properties
}

export interface ParsedJsonData {
  day: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  vedic_sunrise: string;
  vedic_sunset: string;
  tithi: {
    details: TithiDetailJson;
    end_time: TimeDetail;
    end_time_ms: number;
  };
  nakshatra: {
    details: NakshatraDetailJson;
    end_time: TimeDetail;
    end_time_ms: number;
  };
  yog: {
    details: YogDetailJson;
    end_time: TimeDetail;
    end_time_ms: number;
  };
  karan: {
    details: KaranDetailJson;
    end_time: TimeDetail;
    end_time_ms: number;
  };
  hindu_maah: HinduMaahDetailJson;
  paksha: string;
  ritu: string;
  sun_sign: string;
  moon_sign: string;
  ayana: string;
  panchang_yog: string;
  vikram_samvat: number;
  shaka_samvat: number;
  vkram_samvat_name: string;
  shaka_samvat_name: string;
  disha_shool: string;
  disha_shool_remedies: string;
  nak_shool: { direction: string; remedies: string };
  moon_nivas: string;
  abhijit_muhurta: { start: string; end: string };
  rahukaal: { start: string; end: string };
  guliKaal: { start: string; end: string };
  yamghant_kaal: { start: string; end: string };
}

interface TimeDetail {
  hour: number;
  minute: number;
  second: number;
}

interface TithiDetailJson {
  tithi_number: number;
  tithi_name: string;
  special: string;
  summary: string;
  deity: string;
}

interface NakshatraDetailJson {
  nak_number: number;
  nak_name: string;
  ruler: string;
  deity: string;
  special: string;
  summary: string;
}

interface YogDetailJson {
  yog_number: number;
  yog_name: string;
  special: string;
  meaning: string;
}

interface KaranDetailJson {
  karan_number: number;
  karan_name: string;
  special: string;
  deity: string;
}

interface HinduMaahDetailJson {
  adhik_status: boolean;
  purnimanta: string;
  amanta: string;
  amanta_id: number;
  purnimanta_id: number;
}


// Details from tables 1-5 (example, can be expanded)
export interface KaranDetail {
  karan_name: string;
  special: string;
  deity: string;
  end_time_hour: number;
}
export interface NakshatraDetail {
  nak_name: string;
  ruler: string;
  special: string;
  summary: string;
  deity: string;
  end_time_hour: number;
}
export interface TithiDetail {
  tithi_name: string;
  special: string;
  summary: string;
  deity: string;
  end_time_hour: number;
}
export interface YogDetail {
  yog_name: string;
  special: string;
  summary: string; // API says "meaning" but response shows summary
  end_time_hour: number;
}
export interface HinduMaahDetail {
  purnimanta: string;
  amanta: string;
}

export interface EventTypeAPIParams {
  event_id: string; // "0" for list, specific ID for details
  event_date?: string; // "dd-MMM-yyyy" e.g., "04-jun-2025" only for spmode 0
  spmode: "0" | "1"; // "0" for list, "1" for details of event_id
}

export interface EventTypeListItem {
  event_id: number;
  event_name: string;
  mode_id: 0 | 2 | 3; // 0: Occasion, 2: Panchang Tithi, 3: Festival
  default_event_id: number;
}

export interface EventDetailsAPIResponse {
  next_date: string; // "23-May-2026"
  day_name: string; // "Saturday"
  hindu_month: string; // "Jyeshtha"
  tithi_name: string; // "Shukla-Ashtami"
  paksha: string; // "Shukla-Paksha"
  tithi_id: number;
  month_id: string; // "3"
  frequency: string; // "Monthly"
}

export type ReminderCategory = "tithi" | "occasion" | "festival";

export interface ReminderFormData {
  name: string;
  phone: string;
  category: ReminderCategory;
  eventId?: number; // default_event_id from EventTypeListItem
  eventName?: string; 
  nextDate?: string;
  hinduMonth?: string;
  tithiName?: string;
  paksha?: string;
  frequency?: string;
  consent: boolean;
}
