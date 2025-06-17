
"use server";
import {
  fetchLocationFromAPI,
  fetchMonthlyPanchangFromAPI,
  fetchDailyPanchangFromAPI,
  fetchDailyPanchangViaCallPanchangAPI, // Import the new API function
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
  DailyPanchangAPIResponse,
} from "@/types/panchang";
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameMonth, isToday as dateIsToday, parseISO, isValid } from "date-fns";
import { GOOGLE_SHEET_ID, GOOGLE_SHEET_REMINDERS_TAB_NAME, googleSheetsCredentials } from "./google-sheets-credentials";

function parseTimezoneOffset(offsetStr: string | undefined | null): string {
  const DEFAULT_OFFSET = "5.5"; 

  if (offsetStr === null || offsetStr === undefined || typeof offsetStr !== 'string' || offsetStr.trim() === '') {
    console.warn(`[Action] parseTimezoneOffset: Received null, undefined, or empty/invalid input for offsetStr. Using default offset: ${DEFAULT_OFFSET}`);
    return DEFAULT_OFFSET;
  }

  const cleanedOffsetStr = offsetStr.trim();

  const hhmmMatch = cleanedOffsetStr.match(/^(?<sign>[+-])?(?<hours>\d{1,2}):(?<minutes>\d{2})$/);
  if (hhmmMatch && hhmmMatch.groups) {
    const sign = hhmmMatch.groups.sign === '-' ? '-' : '';
    const hours = parseInt(hhmmMatch.groups.hours, 10);
    const minutes = parseInt(hhmmMatch.groups.minutes, 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
      if (minutes === 0) return `${sign}${hours}.0`;
      if (minutes === 30) return `${sign}${hours}.5`;
      if (minutes === 15) return `${sign}${hours}.25`;
      if (minutes === 45) return `${sign}${hours}.75`;
      
      console.warn(`[Action] parseTimezoneOffset: Unhandled minute value ${minutes} in HH:MM format '${cleanedOffsetStr}'. Using default offset: ${DEFAULT_OFFSET}`);
      return DEFAULT_OFFSET;
    }
  }

  const floatVal = parseFloat(cleanedOffsetStr);
  if (!isNaN(floatVal)) {
    if (Number.isInteger(floatVal)) return `${floatVal}.0`;
    // Allow common .5, .25, .75 offsets
    if (Math.abs(floatVal * 100) % 25 === 0) return floatVal.toString();


    console.warn(`[Action] parseTimezoneOffset: Parsed float value ${floatVal} from '${cleanedOffsetStr}' might not be fully supported by Panchang API. Using as is, but default might be safer.`);
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

      const timezoneOffsetApiString = primaryResult.timezone?.offset_STD;
      const timezoneOffsetValueStr = parseTimezoneOffset(timezoneOffsetApiString);
      
      console.log(`[Action] getLocationDetails: Original API offset_STD: ${timezoneOffsetApiString}, Parsed timezoneOffset for UserLocation: ${timezoneOffsetValueStr}`);
      
      const userLocation: UserLocation = {
        latitude: primaryResult.lat,
        longitude: primaryResult.lon,
        city: primaryResult.city || primaryResult.name || primaryResult.suburb || primaryResult.district || "Unknown City",
        state: primaryResult.state || "Unknown State",
        country: primaryResult.country || "Unknown Country",
        timezoneName: primaryResult.timezone?.name,
        timezoneOffset: timezoneOffsetValueStr, // Always a string now
      };
      console.log("[Action] getLocationDetails: Successfully created UserLocation object:", userLocation);
      return userLocation;
    }
    console.warn("[Action] getLocationDetails: No results found in API response or response was empty/invalid.", data);
    // Fallback to a default location if API fails or returns no results
    return {
        latitude: latitude, // Use provided or default lat
        longitude: longitude, // Use provided or default lon
        city: "Bengaluru (Fallback)",
        state: "Karnataka (Fallback)",
        country: "India (Fallback)",
        timezoneOffset: parseTimezoneOffset(undefined), // Will use default
      };
  } catch (error) {
    console.error("[Action] Error in getLocationDetails action:", error);
     // Fallback to a default location on critical error
    return {
        latitude: latitude, 
        longitude: longitude,
        city: "Bengaluru (Error)",
        state: "Karnataka (Error)",
        country: "India (Error)",
        timezoneOffset: parseTimezoneOffset(undefined), // Will use default
      };
  }
}

export async function getMonthlyPanchang(
  year: number,
  month: number, // 1-indexed month
  location: UserLocation 
): Promise<ProcessedPanchangDay[]> {
  const monthToProcess = new Date(year, month - 1, 1); 
  console.log(`[Action] getMonthlyPanchang entered. Year: ${year}, Month: ${month}. Constructed monthToProcess for API: ${monthToProcess.toDateString()}, Location:`, location);

  const apiBirthDate = format(monthToProcess, "dd-MM-yyyy");

  const params: MonthlyPanchangParams = {
    birth_date_: apiBirthDate,
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset, // Guaranteed string
    place_: location.city || "Unknown City",
    country_: location.country || "India",
    state_: location.state || "Unknown State",
    city_: location.longitude.toString(), // API uses city_ for longitude
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
        if (entry.date_name === dateStrForLookup) { // Ensure we only process entries for the current day
            switch (entry.sort) {
            case 1: // Tithi and Nakshatra
                dayData.tithi = entry.tithi_name;
                dayData.nakshatra = entry.nakshatra_name;
                break;
            case 2: // Sunrise
                dayData.sunrise = entry.tithi_name; // API uses tithi_name field for sunrise time here
                break;
            case 3: // Sunset
                dayData.sunset = entry.tithi_name; // API uses tithi_name field for sunset time here
                break;
            case 4: // Special Event
                if (entry.tithi_name && entry.tithi_name.trim() !== "") {
                  dayData.specialEvent = entry.tithi_name.trim();
                }
                break;
            default:
                // console.log(`[Action] getMonthlyPanchang: Unhandled sort type ${entry.sort} for ${dateStrForLookup}`);
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
  location: UserLocation 
): Promise<(DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null> {
  const selectedDate = parse(dateString, 'yyyy-MM-dd', new Date());
  console.log(`[Action] getDailyPanchangDetails for dateString: "${dateString}", Location:`, location);

  const baseParams = {
    birth_date_: format(selectedDate, "dd-MM-yyyy"), 
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset, 
    place_: location.city || "Unknown",
    country_: location.country || "Unknown",
    state_: location.state || "Unknown",
    city_: location.longitude.toString(), // API uses city_ for longitude
    lang_: "hi",
    panchang_type: "1", // For daily
    birth_time_: "07:00:00", 
    json_response: "",
    req_frm: 0,
  };

  // Attempt 1: Call /SavePanchangDetails with spmode: 0
  const params1: DailyPanchangParams = { ...baseParams, spmode: 0, panchang_id: 0 };
  console.log("[Action] getDailyPanchangDetails: Attempt 1 API params (SavePanchangDetails, spmode 0):", params1);
  
  try {
    const response1 = await fetchDailyPanchangFromAPI(params1);
    console.log("[Action] getDailyPanchangDetails: Attempt 1 response (SavePanchangDetails):", response1 ? "Data received" : "No data");
    
    const detail1 = response1?.table?.[0];
    if (detail1?.json_data && detail1.json_data.trim() !== "" && detail1.json_data.trim() !== "{}") {
      console.log("[Action] getDailyPanchangDetails: Attempt 1 SUCCESS - json_data found.");
      try {
        const parsedJson = JSON.parse(detail1.json_data) as ParsedJsonData;
        return { ...detail1, parsed_json_data: parsedJson };
      } catch (e) {
        console.error("[Action] getDailyPanchangDetails: Attempt 1 - Failed to parse json_data:", e, "Raw json_data:", detail1.json_data.substring(0,200));
        // Proceed to fallback even if parsing fails, as json_data might be malformed.
      }
    } else {
      console.log("[Action] getDailyPanchangDetails: Attempt 1 - No valid json_data. Proceeding to fallback.");
    }

    // Fallback: Attempt 2: Call /CallPanchangAPI with spmode: 1
    // Use daily_panchang_id from the first response if available
    const panchangIdForFallback = detail1?.daily_panchang_id || 0;
    const params2: DailyPanchangParams = { ...baseParams, spmode: 1, panchang_id: panchangIdForFallback };
    console.log("[Action] getDailyPanchangDetails: Attempt 2 API params (CallPanchangAPI, spmode 1):", params2);

    const response2 = await fetchDailyPanchangViaCallPanchangAPI(params2);
    console.log("[Action] getDailyPanchangDetails: Attempt 2 response (CallPanchangAPI):", response2 ? "Data received" : "No data");

    const detail2 = response2?.table?.[0];
    if (detail2?.json_data && detail2.json_data.trim() !== "" && detail2.json_data.trim() !== "{}") {
      console.log("[Action] getDailyPanchangDetails: Attempt 2 SUCCESS - json_data found.");
      try {
        const parsedJson = JSON.parse(detail2.json_data) as ParsedJsonData;
        return { ...detail2, parsed_json_data: parsedJson };
      } catch (e) {
        console.error("[Action] getDailyPanchangDetails: Attempt 2 - Failed to parse json_data:", e, "Raw json_data:", detail2.json_data.substring(0,200));
        return null; // Both attempts failed to provide parsable json_data
      }
    } else {
       console.warn("[Action] getDailyPanchangDetails: Attempt 2 - No valid json_data found in fallback response for date:", params2.birth_date_);
       return null;
    }

  } catch (error) {
    console.error(`[Action] Error in getDailyPanchangDetails sequence for ${baseParams.birth_date_}:`, error);
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
    event_date: format(eventDate, "dd/MMM/yyyy"), // API expects dd/MMM/yyyy
    spmode: "1", // For details spmode is 1
  };
  console.log("[Action] getEventDetails: API params:", params);
  try {
    // The API returns an array even for a single event detail request.
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

  // Placeholder - Google Sheets integration with `googleapis` is more involved
  // and typically requires OAuth2 or a service account set up correctly.
  // For now, this simulates a successful reception of data.
  // Actual implementation would use the `googleapis` library.
  // e.g., const {google} = require('googleapis');
  // const sheets = google.sheets({version: 'v4', auth: YOUR_AUTH_CLIENT});
  // await sheets.spreadsheets.values.append({...});

  return { success: true, message: "Reminder data received (Google Sheets integration pending 'googleapis' library)." };
}
