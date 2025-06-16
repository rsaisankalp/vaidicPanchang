
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

const locationApiAuthHeader = {
  Authorization:
    "Basic NTZhMzU3MWU5MTgwNjc1YzBjOTkzNTBhMDc0ZDQ1NGE6OGY2OTk1ZDdlNDM3MTk5ZTcwZDVlNDFkYzAxNTg4YmI=",
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
      ...locationApiAuthHeader, 
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
  console.log(`[API] fetchLocationFromAPI: Raw response text: ${responseText}`);
  try {
    return JSON.parse(responseText) as LocationAPIResponse;
  } catch (e) {
    console.error("[API] fetchLocationFromAPI: Failed to parse location response JSON:", responseText, e);
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
      ...locationApiAuthHeader,
      "content-type": "application/json;",
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchMonthlyPanchangFromAPI: Response status: ${response.status}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch monthly panchang: ${response.statusText}`
    );
  }
  return response.json() as Promise<MonthlyPanchangAPIResponse>;
}

export async function fetchDailyPanchangFromAPI(
  params: DailyPanchangParams
): Promise<DailyPanchangAPIResponse> {
  const apiUrl = `${BASE_URL}/ExternalApi/SavePanchangDetails`;
  console.log(`[API] fetchDailyPanchangFromAPI: Calling ${apiUrl} with params:`, params);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...commonHeaders,
      ...locationApiAuthHeader, 
      "content-type": "application/json;",
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchDailyPanchangFromAPI: Response status: ${response.status}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch daily panchang: ${response.statusText}`);
  }
  return response.json() as Promise<DailyPanchangAPIResponse>;
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
      ...locationApiAuthHeader, 
      "content-type": "application/json",
    },
    body: JSON.stringify(params),
  });
  console.log(`[API] fetchEventTypeListFromAPI: Response status: ${response.status}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch event type list: ${response.statusText}`);
  }
  return response.json();
}
