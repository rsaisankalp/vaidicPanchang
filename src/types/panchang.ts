
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
  offset_STD: string; // e.g., "+05:30"
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
  timezoneOffset: string; // Now always a string, e.g., "5.5"
}

export interface MonthlyPanchangParams {
  birth_date_: string; // dd-MM-yyyy
  lat_: string;
  lon_: string;
  tzone_: string; // e.g. "5.5"
  place_?: string;
  country_?: string;
  state_?: string;
  city_?: string; // API docs say city_ is lon_, confirmed by cURL it's longitude string
  panchang_type: "2"; // For monthly
  birth_time_?: string; // HH:mm:ss, default "07:00:00"
  json_response?: string; // default ""
  lang_?: "hi" | "en"; // default "hi"
  panchang_id?: number; // default 0
  req_frm?: number; // default 0
  spmode?: number; // default 0
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
  sunrise: string; // "5:56AM" (This field seems to be static for the month in the API response)
  sunset: string; // "6:52PM" (This field seems to be static for the month in the API response)
  tithi_name: string; // Actual data like "शु -6" or sunrise/sunset time or special event or empty
  nakshatra_name: string; // "पुष्य " or empty
  date_name: string; // "2025-06-01" (YYYY-MM-DD format)
  sort: number; // 1, 2, 3, 4, 5
  color_code: string;
}

export interface ProcessedPanchangDay {
  date: string; // "2025-06-01"
  dayOfMonth: number;
  tithi?: string; 
  nakshatra?: string; 
  sunrise?: string; 
  sunset?: string; 
  specialEvent?: string;
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
  city_?: string; 
  lang_?: "hi" | "en";
  panchang_type: "1"; // For daily
  json_response?: string; // default ""
  panchang_id?: number; // default 0
  req_frm?: number; // default 0
  spmode?: number; // default 0. Added based on cURL examples
}

export interface DailyPanchangAPIResponse {
  table: DailyPanchangDetail[];
  table1?: KaranDetail[]; 
  table2?: NakshatraDetail[]; 
  table3?: TithiDetail[]; 
  table4?: YogDetail[]; 
  table5?: HinduMaahDetail[]; 
}

export interface DailyPanchangDetail {
  status: number;
  msg: string;
  month_name: string; 
  festive_name?: string; 
  daily_panchang_id: number;
  day_name: string; 
  sunrise: string; 
  sunset: string; 
  moonrise: string; 
  moonset: string; 
  paksha: string; 
  ritu: string; 
  sun_sign: string; 
  moon_sign: string; 
  ayana: string; 
  panchang_yog?: string; 
  vikram_samvat: string; 
  shaka_samvat: string; 
  shaka_samvat_name: string; 
  vkram_samvat_name: string; 
  disha_shool: string; 
  nak_shool?: string; 
  moon_nivas: string; 
  abhijit_muhurta_start: string; 
  abhijit_muhurta_end: string; 
  rahukaal_start_start: string; 
  rahukaal_start_end: string; 
  guliKaal_start: string; 
  guliKaal_end: string; 
  yamghant_kaal_start: string; 
  yamghant_kaal_end: string; 
  json_data?: string; 
  tithi_end_date_time: string; 
  nakshatra_end_date_time: string; 
  yog_end_date_time: string; 
  karan_end_date_time: string; 
  created_datetime: string; 
  [key: string]: any; 
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
  summary: string; 
  end_time_hour: number;
}
export interface HinduMaahDetail {
  purnimanta: string;
  amanta: string;
}

export interface EventTypeAPIParams {
  event_id: string; 
  event_date?: string; 
  spmode: "0" | "1"; 
}

export interface EventTypeListItem {
  event_id: number;
  event_name: string;
  mode_id: 0 | 2 | 3; // 0: Occasion, 2: Panchang Tithi, 3: Festival
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

export type ReminderCategory = "tithi" | "occasion" | "festival";

export interface ReminderFormData {
  name: string;
  phone: string;
  category: ReminderCategory;
  eventId?: number; 
  eventName?: string; 
  nextDate?: string;
  hinduMonth?: string;
  tithiName?: string;
  paksha?: string;
  frequency?: string;
  consent: boolean;
}

