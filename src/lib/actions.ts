
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
  const match = offsetStr.match(/([+-]?)(\d{1,2}):(\d{2})/);
  if (match) {
    const sign = match[1] === '-' ? '-' : '';
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      if (minutes === 30) return `${sign}${hours}.5`;
      if (minutes === 0) return `${sign}${hours}.0`; // Handle cases like "+05:00" -> "5.0"
      console.warn(`[Action] parseTimezoneOffset: Unhandled minute value in offset: ${minutes} for ${offsetStr}`);
      return `${sign}${hours}.${minutes}`; // Fallback if not 00 or 30, e.g. 5.45 for +05:45
    }
  }
  console.warn(`[Action] parseTimezoneOffset: Could not parse timezone offset string: ${offsetStr} with HH:MM regex. Trying direct float parse.`);
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
    console.log("[Action] getLocationDetails: Data received from fetchLocationFromAPI:", data ? "Data received" : "No data", data ? JSON.stringify(data).substring(0,100) : null);

    if (data && data.results && data.results.length > 0) {
      const primaryResult = data.results[0] as LocationResult;
      console.log("[Action] getLocationDetails: Primary result:", primaryResult);
      
      const timezoneOffsetValueStr = parseTimezoneOffset(primaryResult.timezone?.offset_STD);
      if (!timezoneOffsetValueStr) {
          console.warn(`[Action] getLocationDetails: Could not determine valid timezoneOffset from offset_STD: ${primaryResult.timezone?.offset_STD}. This might cause issues with other API calls.`);
      } else {
          console.log(`[Action] getLocationDetails: Parsed timezoneOffset: ${timezoneOffsetValueStr}`);
      }

      const userLocation: UserLocation = {
        latitude: primaryResult.lat,
        longitude: primaryResult.lon,
        city: primaryResult.city || primaryResult.name || primaryResult.suburb || primaryResult.district || "Unknown City",
        state: primaryResult.state || "Unknown State",
        country: primaryResult.country || "Unknown Country",
        timezoneName: primaryResult.timezone?.name,
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
  currentDate: Date, 
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
    place_: location.city || "Unknown",
    country_: location.country || "Unknown",
    state_: location.state || "Unknown",
    city_: location.longitude.toString(), // CRITICAL: city_ param should be longitude as string
    lang_: "hi",
    panchang_type: "2",
    birth_time_: "07:00:00", 
    json_response: "",      
    panchang_id: 0,         
    req_frm: 0,             
    spmode: 0,              
  };
  console.log("[Action] getMonthlyPanchang: API params prepared:", params);

  try {
    const response = await fetchMonthlyPanchangFromAPI(params);
    console.log("[Action] getMonthlyPanchang: Monthly API response received:", response ? "Data received" : "No data");

    if (!response || !response.table || response.table.length === 0) {
        console.error("[Action] getMonthlyPanchang: API response is null, does not contain 'table', or table is empty. Raw response:", response);
        return [];
    }
    const rawPanchang: MonthlyPanchangEntry[] = response.table;
    console.log("[Action] getMonthlyPanchang: Raw panchang entries count:", rawPanchang.length, "First few raw entries:", rawPanchang.slice(0,5));

    const groupedByDate: Record<string, MonthlyPanchangEntry[]> = rawPanchang.reduce((acc: Record<string, MonthlyPanchangEntry[]>, item) => {
      const dateKey = item.date_name; // "YYYY-MM-DD"
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {});
    
    console.log("[Action] getMonthlyPanchang: Grouped by date_name. Number of unique dates:", Object.keys(groupedByDate).length);
    // console.log("[Action] getMonthlyPanchang: Sample grouped data for first date:", Object.keys(groupedByDate).length > 0 ? groupedByDate[Object.keys(groupedByDate)[0]] : "No grouped data");

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    console.log("[Action] getMonthlyPanchang: Processing for days in month:", daysInMonth.length);

    const processedPanchang = daysInMonth.map(dayDate => {
      const dateStr = format(dayDate, "yyyy-MM-dd");
      // console.log(`[Action] getMonthlyPanchang: Processing date: ${dateStr}`);
      const entriesForDate = groupedByDate[dateStr] || [];
      // if (entriesForDate.length === 0) {
      //   console.warn(`[Action] getMonthlyPanchang: No entries found in groupedByDate for ${dateStr}`);
      // }
      
      const dayData: Partial<ProcessedPanchangDay> = {
        date: dateStr,
        dayOfMonth: getDate(dayDate),
        fullDate: dayDate,
        isToday: dateIsToday(dayDate),
        isCurrentMonth: isSameMonth(dayDate, currentDate),
      };

      entriesForDate.forEach(entry => {
        switch (entry.sort) {
          case 1:
            dayData.tithi = entry.tithi_name;
            dayData.nakshatra = entry.nakshatra_name;
            // console.log(`[Action] getMonthlyPanchang: Date ${dateStr}, Sort 1: Tithi='${entry.tithi_name}', Nakshatra='${entry.nakshatra_name}'`);
            break;
          case 2:
            dayData.sunrise = entry.tithi_name; // tithi_name contains sunrise time for sort 2
            // console.log(`[Action] getMonthlyPanchang: Date ${dateStr}, Sort 2: Sunrise='${entry.tithi_name}'`);
            break;
          case 3:
            dayData.sunset = entry.tithi_name; // tithi_name contains sunset time for sort 3
            // console.log(`[Action] getMonthlyPanchang: Date ${dateStr}, Sort 3: Sunset='${entry.tithi_name}'`);
            break;
          case 4:
            if (entry.tithi_name && entry.tithi_name.trim() !== "") {
              dayData.specialEvent = entry.tithi_name.trim();
              // console.log(`[Action] getMonthlyPanchang: Date ${dateStr}, Sort 4: SpecialEvent='${entry.tithi_name.trim()}'`);
            }
            break;
          default:
            // sort 5 is usually empty/not needed for display
            break;
        }
      });
      return dayData as ProcessedPanchangDay;
    });
    
    console.log("[Action] getMonthlyPanchang: Processed panchang data count:", processedPanchang.length);
    if (processedPanchang.length > 0) {
        console.log("[Action] getMonthlyPanchang: Sample processed day (first):", processedPanchang[0]);
        // console.log("[Action] getMonthlyPanchang: Sample processed day (last):", processedPanchang[processedPanchang.length-1]);
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
    place_: location.city || "Unknown",
    country_: location.country || "Unknown",
    state_: location.state || "Unknown",
    city_: location.longitude.toString(), 
    lang_: "hi",
    panchang_type: "1",
  };
  console.log("[Action] getDailyPanchangDetails: API params:", params);

  try {
    const response = await fetchDailyPanchangFromAPI(params);
    console.log("[Action] getDailyPanchangDetails: API response received:", response ? "Data received" : "No data", response ? JSON.stringify(response).substring(0,200) : null);
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
