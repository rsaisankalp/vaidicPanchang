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
// Note: To fully implement saveReminderToSheet, you would typically use the 'googleapis' package.
// As per instructions, I cannot add new npm packages.
// This action will simulate the save or require manual setup of 'googleapis'.

export async function getLocationDetails(
  latitude: number,
  longitude: number
): Promise<UserLocation | null> {
  try {
    const data = await fetchLocationFromAPI(latitude, longitude);
    if (data.results && data.results.length > 0) {
      const primaryResult = data.results[0] as LocationResult;
      const timezoneOffsetValue = parseFloat(primaryResult.timezone.offset_STD.replace('+', ''));
      return {
        latitude: primaryResult.lat,
        longitude: primaryResult.lon,
        city: primaryResult.city || primaryResult.name || primaryResult.suburb || primaryResult.district,
        state: primaryResult.state,
        country: primaryResult.country,
        timezoneName: primaryResult.timezone.name,
        timezoneOffset: timezoneOffsetValue.toString(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching location details:", error);
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
    birth_date_: format(firstDayOfMonth, "dd-MM-yyyy"), // API expects date in this format for the month
    lat_: location.latitude.toString(),
    lon_: location.longitude.toString(),
    tzone_: location.timezoneOffset,
    place_: location.city,
    country_: location.country,
    state_: location.state,
    city_: location.longitude.toString(), // API doc quirk: city is lon
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
    city_: location.longitude.toString(), // API doc quirk
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
    event_date: format(eventDate, "dd-MMM-yyyy"), // e.g. 04-Jun-2025
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
    event_date: format(eventDate, "dd/MMM/yyyy"), // API example for this call uses "03/Jun/2025"
    spmode: "1",
  };
  try {
    // The API might return an array even for a single detail
    const response = (await fetchEventTypeListFromAPI(params)) as EventDetailsAPIResponse[];
    return response && response.length > 0 ? response[0] : null;
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
}


export async function saveReminderToSheet(formData: ReminderFormData): Promise<{success: boolean; message: string}> {
  // This is a placeholder for Google Sheets API interaction.
  // In a real application, you would use the 'googleapis' library here.
  // Ensure GOOGLE_SHEET_ID and googleSheetsCredentials are correctly configured.
  
  console.log("Attempting to save reminder to Google Sheet:", formData);
  console.log("Sheet ID:", GOOGLE_SHEET_ID);
  // console.log("Credentials Client Email:", googleSheetsCredentials.client_email); // Be careful logging sensitive info

  // Example structure of what you'd do with googleapis:
  /*
  try {
    const { GoogleSpreadsheet } = require('google-spreadsheet');
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: googleSheetsCredentials.client_email,
      private_key: googleSheetsCredentials.private_key.replace(/\\n/g, '\n'), // Ensure newlines are correct
    });

    await doc.loadInfo(); // loads document properties and worksheets
    const sheet = doc.sheetsByTitle[GOOGLE_SHEET_REMINDERS_TAB_NAME]; // or use sheetsByIndex[0]

    if (!sheet) {
      return { success: false, message: `Sheet with title "${GOOGLE_SHEET_REMINDERS_TAB_NAME}" not found.` };
    }

    await sheet.addRow({
      Name: formData.name,
      Phone: formData.phone,
      Category: formData.category,
      EventName: formData.eventName || '',
      NextDate: formData.nextDate || '',
      HinduMonth: formData.hinduMonth || '',
      TithiName: formData.tithiName || '',
      Paksha: formData.paksha || '',
      Frequency: formData.frequency || '',
      Consent: formData.consent ? 'Yes' : 'No',
      Timestamp: new Date().toISOString(),
    });

    return { success: true, message: "Reminder saved successfully." };
  } catch (error) {
    console.error("Error saving to Google Sheet:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to save reminder: ${errorMessage}` };
  }
  */

  // Placeholder response:
  return { success: true, message: "Reminder data received (Google Sheets integration pending 'googleapis' library)." };
}
