
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

function parseTimezoneOffset(offsetStr: string | undefined): string | undefined {
  if (typeof offsetStr !== 'string') {
    console.warn(`[Action] parseTimezoneOffset: Received non-string input: ${offsetStr}`);
    return undefined;
  }
  // Handles formats like "+05:30" or "05:30"
  const match = offsetStr.match(/([+-]?)(\d{1,2}):(\d{2})/);
  if (match) {
    const sign = match[1] === '-' ? '-' : '';
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      if (minutes === 30) return `${sign}${hours}.5`;
      if (minutes === 0) return `${sign}${hours}.0`;
      // For other minute values, can't convert to .0 or .5 easily, return as is or handle error
      console.warn(`[Action] parseTimezoneOffset: Unhandled minute value in offset: ${minutes} for ${offsetStr}`);
      return offsetStr; // Or return undefined/throw error
    }
  }
  console.warn(`[Action] parseTimezoneOffset: Could not parse timezone offset string: ${offsetStr} with HH:MM regex. Trying direct float parse.`);
  // Fallback for simple float strings like "5.5"
  const floatVal = parseFloat(offsetStr.replace(/[^\d.-]/g, ''));
  if (!isNaN(floatVal)) {
    return floatVal.toString();
  }
  console.error(`[Action] parseTimezoneOffset: Failed to parse timezone offset string: ${offsetStr}`);
  return undefined;
}


export async function getLocationDetails(
  latitude: number,
  longitude: number
): Promise<UserLocation | null> {
  console.log(`[Action] getLocationDetails called with lat: ${latitude}, lon: ${longitude}`);
  try {
    console.log(`[Action] getLocationDetails: Calling fetchLocationFromAPI with lat: ${latitude}, lon: ${longitude}`);
    const data = await fetchLocationFromAPI(latitude, longitude);
    console.log("[Action] getLocationDetails: Data received from fetchLocationFromAPI:", data ? "Data received" : "No data");

    if (data && data.results && data.results.length > 0) {
      const primaryResult = data.results[0] as LocationResult;
      console.log("[Action] getLocationDetails: Primary result:", primaryResult);
      
      const timezoneOffsetValueStr = parseTimezoneOffset(primaryResult.timezone?.offset_STD);
      if (!timezoneOffsetValueStr) {
          console.warn(`[Action] getLocationDetails: Could not determine valid timezoneOffset from offset_STD: ${primaryResult.timezone?.offset_STD}. This might cause issues with other API calls.`);
      }

      const userLocation: UserLocation = {
        latitude: primaryResult.lat,
        longitude: primaryResult.lon,
        city: primaryResult.city || primaryResult.name || primaryResult.suburb || primaryResult.district || "Unknown City",
        state: primaryResult.state || "Unknown State",
        country: primaryResult.country || "Unknown Country",
        timezoneName: primaryResult.timezone?.name, // Corrected: primaryResult (capital R)
        timezoneOffset: timezoneOffsetValueStr,
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
  currentDate: Date, // Any date within the desired month
  location: UserLocation
): Promise<ProcessedPanchangDay[]> {
  console.log("[Action] getMonthlyPanchang entered for date:", currentDate, "and location:", location);
  if (!location.timezoneOffset) {
    console.error("[Action] getMonthlyPanchang: Timezone offset is required but is missing. Location:", location);
    // Fallback or throw error might be better, but for now, proceed with default.
    location.timezoneOffset = "5.5"; 
    console.warn("[Action] getMonthlyPanchang: Using default timezoneOffset 5.5 due to missing value.");
  }
  const firstDayOfMonth = startOfMonth(currentDate);
  const params: MonthlyPanchangParams = {
    birth_date_: format(firstDayOfMonth, "dd-MM-yyyy"), 
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset, 
    place_: location.city,
    country_: location.country,
    state_: location.state,
    city_: location.longitude.toString(), // CRITICAL: city_ param should be longitude as string
    lang_: "hi",
    panchang_type: "2",
    birth_time_: "07:00:00", // Added from cURL
    json_response: "",      // Added from cURL
    panchang_id: 0,         // Added from cURL
    req_frm: 0,             // Added from cURL
    spmode: 0,              // Added from cURL
  };
  console.log("[Action] getMonthlyPanchang: API params prepared:", params);

  try {
    const response = await fetchMonthlyPanchangFromAPI(params);
    console.log("[Action] getMonthlyPanchang: Monthly API response received:", response ? "Data received" : "No data");

    if (!response || !response.table) {
        console.error("[Action] getMonthlyPanchang: API response is null or does not contain a 'table' property.");
        return [];
    }
    const rawPanchang: MonthlyPanchangEntry[] = response.table;
    console.log("[Action] getMonthlyPanchang: Raw panchang entries:", rawPanchang.length);

    const groupedByDate: Record<string, MonthlyPanchangEntry[]> = rawPanchang.reduce((acc: Record<string, MonthlyPanchangEntry[]>, item) => {
      if (!acc[item.date_name]) {
        acc[item.date_name] = [];
      }
      acc[item.date_name].push(item);
      return acc;
    }, {});
    
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const processedPanchang = daysInMonth.map(dayDate => {
      const dateStr = format(dayDate, "yyyy-MM-dd");
      const entries = groupedByDate[dateStr] || [];
      const dayData: Partial<ProcessedPanchangDay> = {
        date: dateStr,
        dayOfMonth: getDate(dayDate),
        fullDate: dayDate,
        isToday: dateIsToday(dayDate),
        isCurrentMonth: isSameMonth(dayDate, currentDate),
      };

      entries.forEach(entry => {
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
            // console.log(`[Action] getMonthlyPanchang: Unhandled sort type ${entry.sort} for date ${dateStr}`);
            break;
        }
      });
      return dayData as ProcessedPanchangDay;
    });
    
    console.log("[Action] getMonthlyPanchang: Processed panchang data count:", processedPanchang.length);
    if (processedPanchang.length > 0) {
        console.log("[Action] getMonthlyPanchang: Sample processed day:", processedPanchang[0]);
    }
    return processedPanchang;

  } catch (error) {
    console.error("[Action] Error fetching or processing monthly panchang:", error);
    return [];
  }
}

export async function getDailyPanchangDetails(
  date: Date,
  location: UserLocation
): Promise<(DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null> {
  console.log("[Action] getDailyPanchangDetails called for date:", date, "and location:", location);
  if (!location.timezoneOffset) {
    console.error("[Action] getDailyPanchangDetails: Timezone offset is required but is missing. Location:", location);
    location.timezoneOffset = "5.5"; // Fallback
    console.warn("[Action] getDailyPanchangDetails: Using default timezoneOffset 5.5 due to missing value.");
  }

  const params: DailyPanchangParams = {
    birth_date_: format(date, "dd-MM-yyyy"),
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset, 
    place_: location.city,
    country_: location.country,
    state_: location.state,
    city_: location.longitude.toString(), // Assuming daily also uses longitude for city_ based on monthly
    lang_: "hi",
    panchang_type: "1",
  };
  console.log("[Action] getDailyPanchangDetails: API params:", params);

  try {
    const response = await fetchDailyPanchangFromAPI(params);
    console.log("[Action] getDailyPanchangDetails: API response received:", response ? "Data received" : "No data");
    if (response && response.table && response.table.length > 0) {
      const detail = response.table[0];
      let parsedJson: ParsedJsonData | undefined = undefined;
      if (detail.json_data) {
        try {
          parsedJson = JSON.parse(detail.json_data) as ParsedJsonData;
          console.log("[Action] getDailyPanchangDetails: Successfully parsed json_data.");
        } catch (e) {
          console.error("[Action] getDailyPanchangDetails: Failed to parse json_data from daily panchang:", e);
        }
      }
      return { ...detail, parsed_json_data: parsedJson };
    }
    console.warn("[Action] getDailyPanchangDetails: No details found in API response table.");
    return null;
  } catch (error) {
    console.error("[Action] Error fetching or processing daily panchang details:", error);
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
  
  // Placeholder for actual Google Sheets API interaction
  // Simulating a successful save for now.
  // In a real scenario with 'googleapis', you would await the API call here.
  
  // Example:
  // try {
  //   const {google} = require('googleapis');
  //   const auth = new google.auth.GoogleAuth({
  //     credentials: {
  //       client_email: googleSheetsCredentials.client_email,
  //       private_key: googleSheetsCredentials.private_key.replace(/\\n/g, '\n'),
  //     },
  //     scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  //   });
  //   const sheets = google.sheets({version: 'v4', auth});
  //   const spreadsheetId = GOOGLE_SHEET_ID;
  //   const range = `${GOOGLE_SHEET_REMINDERS_TAB_NAME}!A1`; // Or choose a specific range to append
  //   const valueInputOption = 'USER_ENTERED';
  //   const resource = {
  //     values: [[
  //       formData.name,
  //       formData.phone,
  //       formData.category,
  //       formData.eventName || '',
  //       formData.nextDate || '',
  //       formData.hinduMonth || '',
  //       formData.tithiName || '',
  //       formData.paksha || '',
  //       formData.frequency || '',
  //       formData.consent ? 'Yes' : 'No',
  //       new Date().toISOString(),
  //     ]],
  //   };
  //   await sheets.spreadsheets.values.append({
  //     spreadsheetId,
  //     range,
  //     valueInputOption,
  //     requestBody: resource,
  //   });
  //   return { success: true, message: "Reminder saved successfully to Google Sheet." };
  // } catch (error) {
  //   console.error("Error saving to Google Sheet:", error);
  //   const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
  //   return { success: false, message: `Failed to save reminder to Google Sheet: ${errorMessage}` };
  // }
  
  return { success: true, message: "Reminder data received (Google Sheets integration pending 'googleapis' library)." };
}

