
"use server";

import type {
  LocationAPIResponse,
  MonthlyPanchangParams,
  MonthlyPanchangAPIResponse,
  DailyPanchangParams,
  DailyPanchangAPIResponse,
  EventTypeAPIParams,
  EventTypeListItem,
  EventDetailsAPIResponse,
} from "@/types/panchang";

const BASE_URL = "https://gwala.krishnayangauraksha.org";

const commonHeaders = {
  "accept": "application/json, text/javascript, */*; q=0.01",
  "accept-language": "en-IN,en;q=0.9",
  "dnt": "1",
  "origin": BASE_URL,
  "priority": "u=1, i",
  "referer": `${BASE_URL}/Donor/Panchang`,
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
  "x-requested-with": "XMLHttpRequest",
};

// Authorization header to be used for daily panchang API calls
const dailyPanchangAuthHeader = {
  "Authorization": "Basic NTZhMzU3MWU5MTgwNjc1YzBjOTkzNTBhMDc0ZDQ1NGE6OGY2OTk1ZDdlNDM3MTk5ZTcwZDVlNDFkYzAxNTg4YmI=",
};

export async function fetchLocationFromAPI(
  latitude: number,
  longitude: number
): Promise<LocationAPIResponse> {
  const apiUrl = `${BASE_URL}/Donor/get_Place_by_lat_log`;
  const requestBody = JSON.stringify({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });
  console.log(`[API] fetchLocationFromAPI: Calling ${apiUrl} with body: ${requestBody}`);
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json; charset=UTF-8",
    },
    body: requestBody,
  });
  console.log(`[API] fetchLocationFromAPI: Response status: ${response.status}`);

  if (!response.ok) {
    let errorBody = "Could not read error body.";
    try {
      errorBody = await response.text();
      console.error(`[API] fetchLocationFromAPI: Error body: ${errorBody}`);
    } catch (e) {
      console.error(`[API] fetchLocationFromAPI: Failed to read error body, status: ${response.status}`);
    }
    throw new Error(`Failed to fetch location: ${response.status} ${response.statusText}. Details: ${errorBody}`);
  }
  
  const responseText = await response.text();
  console.log(`[API] fetchLocationFromAPI: Raw response text (length: ${responseText.length}): ${responseText.substring(0, 200)}...`);
  try {
    let parsedData = JSON.parse(responseText);
    if (typeof parsedData === 'string') {
      console.log("[API] fetchLocationFromAPI: Detected stringified JSON, attempting second parse.");
      parsedData = JSON.parse(parsedData);
    }
    console.log("[API] fetchLocationFromAPI: Successfully parsed data.");
    return parsedData as LocationAPIResponse;
  } catch (e) {
    console.error("[API] fetchLocationFromAPI: Failed to parse location response JSON:", e, "Original text:", responseText.substring(0,500));
    throw new Error("Invalid JSON response for location");
  }
}

export async function fetchMonthlyPanchangFromAPI(
  params: MonthlyPanchangParams
): Promise<MonthlyPanchangAPIResponse> {
  const apiUrl = `${BASE_URL}/ExternalApi/SavePanchangDetails`;
  console.log(`[API] fetchMonthlyPanchangFromAPI: Calling ${apiUrl} with params:`, params);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json;", 
      // Monthly panchang does not seem to require Authorization based on cURL patterns seen so far.
      // If it does, ...dailyPanchangAuthHeader can be added here.
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchMonthlyPanchangFromAPI: Response status: ${response.status}`);
  const responseText = await response.text();
  console.log(`[API] fetchMonthlyPanchangFromAPI: Raw response text (length: ${responseText.length}): ${responseText.substring(0, 500)}...`);
  
  if (!response.ok) {
    console.error(`[API] fetchMonthlyPanchangFromAPI: Error - ${response.statusText}, Body: ${responseText}`);
    throw new Error(
      `Failed to fetch monthly panchang: ${response.statusText}. Details: ${responseText}`
    );
  }
  try {
    const jsonData = JSON.parse(responseText);
    console.log("[API] fetchMonthlyPanchangFromAPI: Successfully parsed monthly panchang data.");
    return jsonData as MonthlyPanchangAPIResponse;
  } catch (e) {
    console.error("[API] fetchMonthlyPanchangFromAPI: Failed to parse monthly panchang JSON:", e, "Original text:", responseText.substring(0,500));
    throw new Error("Invalid JSON response for monthly panchang");
  }
}

export async function fetchDailyPanchangFromAPI( // This targets /SavePanchangDetails
  params: DailyPanchangParams
): Promise<DailyPanchangAPIResponse> {
  const apiUrl = `${BASE_URL}/ExternalApi/SavePanchangDetails`;
  console.log(`[API] fetchDailyPanchangFromAPI (SavePanchangDetails): Calling ${apiUrl} with params:`, params);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json;",
      ...dailyPanchangAuthHeader, // Added Authorization
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchDailyPanchangFromAPI (SavePanchangDetails): Response status: ${response.status}`);
  const responseText = await response.text(); 
  console.log(`[API] fetchDailyPanchangFromAPI (SavePanchangDetails): Raw response text (length ${responseText.length}): ${responseText.substring(0, 500)}...`);

  if (!response.ok) {
    console.error(`[API] fetchDailyPanchangFromAPI (SavePanchangDetails): Error - ${response.statusText}, Body: ${responseText}`);
    throw new Error(`Failed to fetch daily panchang (SavePanchangDetails): ${response.statusText}. Details: ${responseText}`);
  }
  try {
    const jsonData = JSON.parse(responseText);
    console.log("[API] fetchDailyPanchangFromAPI (SavePanchangDetails): Successfully parsed daily panchang data.");
    return jsonData as DailyPanchangAPIResponse;
  } catch (e) {
    console.error("[API] fetchDailyPanchangFromAPI (SavePanchangDetails): Failed to parse daily panchang JSON:", e, "Original text:", responseText.substring(0,500));
    throw new Error("Invalid JSON response for daily panchang (SavePanchangDetails)");
  }
}

export async function fetchDailyPanchangViaCallPanchangAPI( // This targets /CallPanchangAPI
  params: DailyPanchangParams
): Promise<DailyPanchangAPIResponse> {
  const apiUrl = `${BASE_URL}/ExternalApi/CallPanchangAPI`;
  console.log(`[API] fetchDailyPanchangViaCallPanchangAPI: Calling ${apiUrl} with params:`, params);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json;",
      ...dailyPanchangAuthHeader, // Added Authorization
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchDailyPanchangViaCallPanchangAPI: Response status: ${response.status}`);
  const responseText = await response.text();
  console.log(`[API] fetchDailyPanchangViaCallPanchangAPI: Raw response text (length ${responseText.length}): ${responseText.substring(0, 500)}...`);

  if (!response.ok) {
    console.error(`[API] fetchDailyPanchangViaCallPanchangAPI: Error - ${response.statusText}, Body: ${responseText}`);
    throw new Error(`Failed to fetch daily panchang (CallPanchangAPI): ${response.statusText}. Details: ${responseText}`);
  }
  try {
    const jsonData = JSON.parse(responseText);
    console.log("[API] fetchDailyPanchangViaCallPanchangAPI: Successfully parsed daily panchang data.");
    return jsonData as DailyPanchangAPIResponse;
  } catch (e) {
    console.error("[API] fetchDailyPanchangViaCallPanchangAPI: Failed to parse daily panchang JSON:", e, "Original text:", responseText.substring(0,500));
    throw new Error("Invalid JSON response for daily panchang (CallPanchangAPI)");
  }
}


export async function fetchEventTypeListFromAPI(
  params: EventTypeAPIParams
): Promise<EventTypeListItem[] | EventDetailsAPIResponse[]> {
  const apiUrl = `${BASE_URL}/Donor/GetEventTypeList`;
  console.log(`[API] fetchEventTypeListFromAPI: Calling ${apiUrl} with params:`, params);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json",
      // No Authorization header based on observed patterns
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchEventTypeListFromAPI: Response status: ${response.status}`);
  const responseText = await response.text(); 
  console.log(`[API] fetchEventTypeListFromAPI: Raw response text (length ${responseText.length}): ${responseText.substring(0, 500)}...`);

  if (!response.ok) {
    console.error(`[API] fetchEventTypeListFromAPI: Error - ${response.statusText}, Body: ${responseText}`);
    throw new Error(`Failed to fetch event type list: ${response.statusText}. Details: ${responseText}`);
  }
  try {
    const jsonData = JSON.parse(responseText);
    console.log("[API] fetchEventTypeListFromAPI: Successfully parsed event type list data.");
    return jsonData;
  } catch (e) {
    console.error("[API] fetchEventTypeListFromAPI: Failed to parse event type list JSON:", e, "Original text:", responseText.substring(0,500));
    throw new Error("Invalid JSON response for event type list");
  }
}
