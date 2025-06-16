
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

export async function getLocationDetails(
  latitude: number,
  longitude: number
): Promise<UserLocation | null> {
  console.log(`[Action] getLocationDetails called with lat: ${latitude}, lon: ${longitude}`);
  try {
    const data = await fetchLocationFromAPI(latitude, longitude);
    if (data && data.results && data.results.length > 0) {
      const primaryResult = data.results[0] as LocationResult;
      
      // Ensure timezone and offset_STD exist before trying to access/parse
      const offsetStr = primaryResult.timezone?.offset_STD;
      let timezoneOffsetValueStr: string | undefined = undefined;
      if (typeof offsetStr === 'string') {
        const timezoneOffsetValue = parseFloat(offsetStr.replace(/[^\d.-]/g, '')); // Sanitize and parse
        if (!isNaN(timezoneOffsetValue)) {
            timezoneOffsetValueStr = timezoneOffsetValue.toString();
        } else {
            console.warn(`[Action] getLocationDetails: Could not parse timezone offset_STD: ${offsetStr}`);
        }
      } else {
        console.warn(`[Action] getLocationDetails: timezone.offset_STD is missing or not a string:`, primaryResult.timezone);
      }

      return {
        latitude: primaryResult.lat,
        longitude: primaryResult.lon,
        city: primaryResult.city || primaryResult.name || primaryResult.suburb || primaryResult.district || "Unknown City",
        state: primaryResult.state || "Unknown State",
        country: primaryResult.country || "Unknown Country",
        timezoneName: primaryResult.timezone?.name,
        timezoneOffset: timezoneOffsetValueStr,
      };
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
  if (!location.timezoneOffset) {
    console.error("Timezone offset is required for monthly panchang");
    return [];
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
    city_: location.longitude.toString(), 
    lang_: "hi",
    panchang_type: "2",
  };

  try {
    const response = await fetchMonthlyPanchangFromAPI(params);
    const rawPanchang: MonthlyPanchangEntry[] = response.table;

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
        if (entry.sort === 1) {
          dayData.tithi = entry.tithi_name;
          dayData.nakshatra = entry.nakshatra_name;
        } else if (entry.sort === 2) {
          dayData.sunrise = entry.tithi_name;
        } else if (entry.sort === 3) {
          dayData.sunset = entry.tithi_name;
        } else if (entry.sort === 4 && entry.tithi_name && entry.tithi_name.trim() !== "") {
          dayData.specialEvent = entry.tithi_name.trim();
        }
      });
      return dayData as ProcessedPanchangDay;
    });
    
    return processedPanchang;

  } catch (error) {
    console.error("Error fetching monthly panchang:", error);
    return [];
  }
}

export async function getDailyPanchangDetails(
  date: Date,
  location: UserLocation
): Promise<(DailyPanchangDetail & { parsed_json_data?: ParsedJsonData }) | null> {
  if (!location.timezoneOffset) {
    console.error("Timezone offset is required for daily panchang");
    return null;
  }

  const params: DailyPanchangParams = {
    birth_date_: format(date, "dd-MM-yyyy"),
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset,
    place_: location.city,
    country_: location.country,
    state_: location.state,
    city_: location.longitude.toString(), 
    lang_: "hi",
    panchang_type: "1",
  };

  try {
    const response = await fetchDailyPanchangFromAPI(params);
    if (response.table && response.table.length > 0) {
      const detail = response.table[0];
      let parsedJson: ParsedJsonData | undefined = undefined;
      if (detail.json_data) {
        try {
          parsedJson = JSON.parse(detail.json_data) as ParsedJsonData;
        } catch (e) {
          console.error("Failed to parse json_data from daily panchang:", e);
        }
      }
      return { ...detail, parsed_json_data: parsedJson };
    }
    return null;
  } catch (error) {
    console.error("Error fetching daily panchang details:", error);
    return null;
  }
}

export async function getEventTypes(
  eventDate: Date
): Promise<EventTypeListItem[]> {
  const params: EventTypeAPIParams = {
    event_id: "0",
    event_date: format(eventDate, "dd-MMM-yyyy"), 
    spmode: "0",
  };
  try {
    const response = (await fetchEventTypeListFromAPI(params)) as EventTypeListItem[];
    return response;
  } catch (error) {
    console.error("Error fetching event types:", error);
    return [];
  }
}

export async function getEventDetails(
  eventId: number,
  eventDate: Date,
): Promise<EventDetailsAPIResponse | null> {
 const params: EventTypeAPIParams = {
    event_id: eventId.toString(),
    event_date: format(eventDate, "dd/MMM/yyyy"), 
    spmode: "1",
  };
  try {
    const response = (await fetchEventTypeListFromAPI(params)) as EventDetailsAPIResponse[];
    return response && response.length > 0 ? response[0] : null;
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
}


export async function saveReminderToSheet(formData: ReminderFormData): Promise<{success: boolean; message: string}> {
  
  console.log("Attempting to save reminder to Google Sheet:", formData);
  console.log("Sheet ID:", GOOGLE_SHEET_ID);
  
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
