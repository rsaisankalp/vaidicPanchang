
"use server";
import {
  fetchLocationFromAPI,
  fetchMonthlyPanchangFromAPI,
  fetchDailyPanchangFromAPI,
  fetchEventTypeListFromAPI,
} from "./panchang-api";
import type {
  UserLocation,
  LocationResult,
  MonthlyPanchangParams,
  ProcessedPanchangDay,
  MonthlyPanchangEntry,
  DailyPanchangParams,
  DailyPanchangDetail,
  ParsedJsonData,
  EventTypeAPIParams,
  EventTypeListItem,
  EventDetailsAPIResponse,
  ReminderFormData,
} from "@/types/panchang";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameMonth, isToday as dateIsToday, parseISO } from "date-fns";
import { GOOGLE_SHEET_ID, GOOGLE_SHEET_REMINDERS_TAB_NAME, googleSheetsCredentials } from "./google-sheets-credentials";

function parseTimezoneOffset(offsetStr: string | undefined | null): string {
  const DEFAULT_OFFSET = "5.5"; // Default to IST if parsing fails

  if (offsetStr === null || offsetStr === undefined || typeof offsetStr !== 'string' || offsetStr.trim() === '') {
    console.warn(`[Action] parseTimezoneOffset: Received null, undefined, or empty/invalid input for offsetStr. Using default offset: ${DEFAULT_OFFSET}`);
    return DEFAULT_OFFSET;
  }

  const cleanedOffsetStr = offsetStr.trim();

  // Try HH:MM format (e.g., "+05:30", "-04:00")
  const hhmmMatch = cleanedOffsetStr.match(/^(?<sign>[+-])?(?<hours>\d{1,2}):(?<minutes>\d{2})$/);
  if (hhmmMatch && hhmmMatch.groups) {
    const sign = hhmmMatch.groups.sign === '-' ? '-' : '';
    const hours = parseInt(hhmmMatch.groups.hours, 10);
    const minutes = parseInt(hhmmMatch.groups.minutes, 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
      if (minutes === 0) {
        return `${sign}${hours}.0`;
      } else if (minutes === 30) {
        return `${sign}${hours}.5`;
      } else if (minutes === 15) { // Support for .25
        return `${sign}${hours}.25`;
      } else if (minutes === 45) { // Support for .75
        return `${sign}${hours}.75`;
      } else {
        console.warn(`[Action] parseTimezoneOffset: Unhandled minute value ${minutes} in HH:MM format '${cleanedOffsetStr}'. Using default offset: ${DEFAULT_OFFSET} instead of calculating decimal hours.`);
        return DEFAULT_OFFSET; // Sticking to API preferred formats or default
      }
    }
  }

  // Try direct float/decimal format (e.g., "5.5", "-4", "+7.75")
  // parseFloat handles leading "+" or "-"
  const floatVal = parseFloat(cleanedOffsetStr);
  if (!isNaN(floatVal)) {
    // Ensure it has one decimal place if it's a whole number (e.g., 5 -> 5.0)
    // Or if it's like 5.5, keep it as 5.5. Or 5.25 etc.
     // The API seems to prefer .0 or .5. Let's check common cases.
    if (Number.isInteger(floatVal)) return `${floatVal}.0`;
    if (Math.abs(floatVal * 100) % 100 === 50) return floatVal.toString(); // e.g., 5.5, -2.5
    if (Math.abs(floatVal * 100) % 100 === 0) return `${floatVal}.0`; // Handles x.00
    
    // For .25, .75, etc. the API might not support it.
    // Log a warning and consider if default is better for unsupported decimal values.
    console.warn(`[Action] parseTimezoneOffset: Parsed float value ${floatVal} from '${cleanedOffsetStr}' might not be fully supported by Panchnag API (expects .0 or .5). Using as is.`);
    return floatVal.toString();
  }

  console.error(`[Action] parseTimezoneOffset: Failed to parse timezone offset string: '${cleanedOffsetStr}' after all attempts. Using default offset: ${DEFAULT_OFFSET}`);
  return DEFAULT_OFFSET;
}


export async function getLocationDetails(
  latitude: number,
  longitude: number
): Promise<UserLocation | null> {
  console.log(`[Action] getLocationDetails called with lat: ${latitude}, lon: ${longitude}`);
  try {
    console.log(`[Action] getLocationDetails: Calling fetchLocationFromAPI with lat: ${latitude}, lon: ${longitude}`);
    const data = await fetchLocationFromAPI(latitude, longitude);
    console.log("[Action] getLocationDetails: Data received from fetchLocationFromAPI:", data ? "Data received" : "No data", data ? JSON.stringify(data).substring(0,100) : null);

    if (data && data.results && data.results.length > 0) {
      const primaryResult = data.results[0] as LocationResult;
      console.log("[Action] getLocationDetails: Primary result:", primaryResult);

      // primaryResult.timezone might be undefined if API doesn't return it
      const timezoneOffsetApiString = primaryResult.timezone?.offset_STD;
      const timezoneOffsetValueStr = parseTimezoneOffset(timezoneOffsetApiString);
      // timezoneOffsetValueStr is now guaranteed to be a string.

      console.log(`[Action] getLocationDetails: Original API offset_STD: ${timezoneOffsetApiString}, Parsed timezoneOffset for UserLocation: ${timezoneOffsetValueStr}`);
      
      const userLocation: UserLocation = {
        latitude: primaryResult.lat,
        longitude: primaryResult.lon,
        city: primaryResult.city || primaryResult.name || primaryResult.suburb || primaryResult.district || "Unknown City",
        state: primaryResult.state || "Unknown State",
        country: primaryResult.country || "Unknown Country",
        timezoneName: primaryResult.timezone?.name, // This can be undefined if timezone is missing
        timezoneOffset: timezoneOffsetValueStr, // Guaranteed string
      };
      console.log("[Action] getLocationDetails: Successfully created UserLocation object:", userLocation);
      return userLocation;
    }
    console.warn("[Action] getLocationDetails: No results found in API response or response was empty/invalid.", data);
    return null;
  } catch (error) {
    console.error("[Action] Error in getLocationDetails action:", error);
    return null;
  }
}

export async function getMonthlyPanchang(
  year: number,
  month: number, // 1-indexed month
  location: UserLocation // UserLocation.timezoneOffset is now guaranteed string
): Promise<ProcessedPanchangDay[]> {
  const monthToProcess = new Date(year, month - 1, 1); 
  console.log(`[Action] getMonthlyPanchang entered. Year: ${year}, Month: ${month}. Constructed monthToProcess for API: ${monthToProcess.toDateString()}, Location:`, location);

  // No longer need to check/fallback for location.timezoneOffset, as it's guaranteed.
  console.log(`[Action] getMonthlyPanchang: Using timezoneOffset from location: ${location.timezoneOffset}`);

  const apiBirthDate = format(monthToProcess, "dd-MM-yyyy");
  console.log(`[Action] getMonthlyPanchang: API 'birth_date_' will be: ${apiBirthDate}`);

  const params: MonthlyPanchangParams = {
    birth_date_: apiBirthDate,
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset, // Directly use the guaranteed string
    place_: location.city || "Unknown City",
    country_: location.country || "India",
    state_: location.state || "Unknown State",
    city_: location.longitude.toString(), 
    birth_time_: "07:00:00",
    json_response: "",
    lang_: "hi",
    panchang_id: 0,
    req_frm: 0,
    panchang_type: "2",
    spmode: 0,
  };
  console.log("[Action] getMonthlyPanchang: API params prepared:", params);

  try {
    const response = await fetchMonthlyPanchangFromAPI(params);
    console.log("[Action] getMonthlyPanchang: Monthly API response received (first 500 chars):", response ? JSON.stringify(response).substring(0,500) : "No data");

    if (!response || !response.table || response.table.length === 0) {
        console.error("[Action] getMonthlyPanchang: API response is null, does not contain 'table', or table is empty. Raw response:", response);
        return [];
    }
    const rawPanchang: MonthlyPanchangEntry[] = response.table;
    console.log("[Action] getMonthlyPanchang: Raw panchang entries count:", rawPanchang.length, "First few raw entries:", rawPanchang.slice(0,5));

    const groupedByDate: Record<string, MonthlyPanchangEntry[]> = rawPanchang.reduce((acc: Record<string, MonthlyPanchangEntry[]>, item) => {
      const dateKey = item.date_name; 
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {});

    console.log("[Action] getMonthlyPanchang: Grouped by date_name. Number of unique dates in API response:", Object.keys(groupedByDate).length);
    if (Object.keys(groupedByDate).length > 0) {
        const firstDateKey = Object.keys(groupedByDate)[0];
        console.log(`[Action] getMonthlyPanchang: Sample grouped data for first API date '${firstDateKey}':`, groupedByDate[firstDateKey]);
    }

    const monthStartForCalendar = monthToProcess; 
    const monthEndForCalendar = endOfMonth(monthStartForCalendar);
    const daysInMonth = eachDayOfInterval({ start: monthStartForCalendar, end: monthEndForCalendar });
    console.log(`[Action] getMonthlyPanchang: Processing for days in calendar month (year: ${year}, month: ${month}). Start: ${monthStartForCalendar.toDateString()}, End: ${monthEndForCalendar.toDateString()}. Total days: ${daysInMonth.length} days`);

    const processedPanchang = daysInMonth.map(dayDate => {
      const dateStrForLookup = format(dayDate, "yyyy-MM-dd");
      const entriesForApiDate = groupedByDate[dateStrForLookup] || [];

      const dayData: Partial<ProcessedPanchangDay> = {
        date: dateStrForLookup,
        dayOfMonth: getDate(dayDate),
        fullDate: dayDate,
        isToday: dateIsToday(dayDate),
        isCurrentMonth: isSameMonth(dayDate, monthStartForCalendar),
      };

      entriesForApiDate.forEach(entry => {
        if (entry.date_name === dateStrForLookup) {
            switch (entry.sort) {
            case 1:
                dayData.tithi = entry.tithi_name;
                dayData.nakshatra = entry.nakshatra_name;
                break;
            case 2:
                dayData.sunrise = entry.tithi_name;
                break;
            case 3:
                dayData.sunset = entry.tithi_name;
                break;
            case 4:
                if (entry.tithi_name && entry.tithi_name.trim() !== "") {
                  dayData.specialEvent = entry.tithi_name.trim();
                }
                break;
            default:
                break;
            }
        }
      });
      return dayData as ProcessedPanchangDay;
    });

    console.log("[Action] getMonthlyPanchang: Processed panchang data count:", processedPanchang.length);
    if (processedPanchang.length > 0) {
        const firstDayProcessed = processedPanchang[0];
        const lastDayProcessed = processedPanchang[processedPanchang.length -1];
        console.log(`[Action] getMonthlyPanchang: First processed day (${firstDayProcessed.date}, isCurrentMonth: ${firstDayProcessed.isCurrentMonth}):`, firstDayProcessed);
        console.log(`[Action] getMonthlyPanchang: Last processed day (${lastDayProcessed.date}, isCurrentMonth: ${lastDayProcessed.isCurrentMonth}):`, lastDayProcessed);
    }
    return processedPanchang;

  } catch (error) {
    console.error("[Action] Error fetching or processing monthly panchang:", error);
    return [];
  }
}

export async function getDailyPanchangDetails(
  dateString: string, // Expecting "yyyy-MM-dd"
  location: UserLocation // UserLocation.timezoneOffset is now guaranteed string
): Promise<(DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null> {
  const selectedDate = parse(dateString, 'yyyy-MM-dd', new Date());
  console.log(`[Action] getDailyPanchangDetails called for dateString: "${dateString}", parsed to selectedDate: ${selectedDate.toDateString()}, using location:`, location);

  // No longer need to check/fallback for location.timezoneOffset
  console.log(`[Action] getDailyPanchangDetails: Using timezoneOffset from location: ${location.timezoneOffset}`);

  const params: DailyPanchangParams = {
    birth_date_: format(selectedDate, "dd-MM-yyyy"), 
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset, // Directly use the guaranteed string
    place_: location.city || "Unknown",
    country_: location.country || "Unknown",
    state_: location.state || "Unknown",
    city_: location.longitude.toString(),
    lang_: "hi",
    panchang_type: "1",
    birth_time_: "07:00:00", 
    json_response: "",
    panchang_id: 0,
    req_frm: 0,
    spmode: 0,
  };
  console.log("[Action] getDailyPanchangDetails: API params:", params);

  try {
    const response = await fetchDailyPanchangFromAPI(params);
    console.log("[Action] getDailyPanchangDetails: API response received:", response ? "Data received" : "No data", response ? JSON.stringify(response).substring(0,200) : null);
    if (response && response.table && response.table.length > 0) {
      const detail = response.table[0];
      console.log(`[Action] getDailyPanchangDetails: Detail from API for ${params.birth_date_}:`, detail.month_name, detail.day_name);
      let parsedJson: ParsedJsonData | undefined = undefined;
      if (detail.json_data) {
        try {
          parsedJson = JSON.parse(detail.json_data) as ParsedJsonData;
          console.log("[Action] getDailyPanchangDetails: Successfully parsed json_data.");
        } catch (e) {
          console.error("[Action] getDailyPanchangDetails: Failed to parse json_data from daily panchang:", e, "Raw json_data:", detail.json_data.substring(0,200));
        }
      }
      return { ...detail, parsed_json_data: parsedJson };
    }
    console.warn("[Action] getDailyPanchangDetails: No details found in API response table for date:", params.birth_date_);
    return null;
  } catch (error) {
    console.error(`[Action] Error fetching or processing daily panchang details for ${params.birth_date_}:`, error);
    return null;
  }
}

export async function getEventTypes(
  eventDate: Date
): Promise<EventTypeListItem[]> {
  console.log("[Action] getEventTypes called for eventDate:", eventDate);
  const params: EventTypeAPIParams = {
    event_id: "0",
    event_date: format(eventDate, "dd-MMM-yyyy"),
    spmode: "0",
  };
  console.log("[Action] getEventTypes: API params:", params);
  try {
    const response = (await fetchEventTypeListFromAPI(params)) as EventTypeListItem[];
    console.log("[Action] getEventTypes: API response received, count:", response ? response.length : 0);
    return response || [];
  } catch (error) {
    console.error("[Action] Error fetching event types:", error);
    return [];
  }
}

export async function getEventDetails(
  eventId: number,
  eventDate: Date,
): Promise<EventDetailsAPIResponse | null> {
 console.log("[Action] getEventDetails called for eventId:", eventId, "eventDate:", eventDate);
 const params: EventTypeAPIParams = {
    event_id: eventId.toString(),
    event_date: format(eventDate, "dd/MMM/yyyy"),
    spmode: "1",
  };
  console.log("[Action] getEventDetails: API params:", params);
  try {
    const responseArray = (await fetchEventTypeListFromAPI(params)) as EventDetailsAPIResponse[];
    const result = responseArray && responseArray.length > 0 ? responseArray[0] : null;
    console.log("[Action] getEventDetails: API response processed, result:", result);
    return result;
  } catch (error) {
    console.error("[Action] Error fetching event details:", error);
    return null;
  }
}


export async function saveReminderToSheet(formData: ReminderFormData): Promise<{success: boolean; message: string}> {

  console.log("[Action] Attempting to save reminder to Google Sheet:", formData);
  console.log("[Action] Sheet ID:", GOOGLE_SHEET_ID);

  return { success: true, message: "Reminder data received (Google Sheets integration pending 'googleapis' library)." };
}

