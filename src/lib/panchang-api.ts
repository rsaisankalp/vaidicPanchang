
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

// This specific auth header seems to be required only by some endpoints.
const locationApiAuthHeader = {
  Authorization:
    "Basic NTZhMzU3MWU5MTgwNjc1YzBjOTkzNTBhMDc0ZDQ1NGE6OGY2OTk1ZDdlNDM3MTk5ZTcwZDVlNDFkYzAxNTg4YmI=",
};

export async function fetchLocationFromAPI(
  latitude: number,
  longitude: number
): Promise<LocationAPIResponse> {
  const response = await fetch(`${BASE_URL}/Donor/get_Place_by_lat_log`, {
    method: "POST",
    headers: {
      ...commonHeaders,
      // Removed locationApiAuthHeader as it might be causing issues for this specific endpoint
      "content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    }),
  });

  if (!response.ok) {
    let errorBody = "Could not read error body.";
    try {
      errorBody = await response.text();
    } catch (e) {
      // Ignore if reading body fails
    }
    console.error(`Failed to fetch location: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    throw new Error(`Failed to fetch location: ${response.status} ${response.statusText}`);
  }
  const responseText = await response.text();
  try {
    return JSON.parse(responseText) as LocationAPIResponse;
  } catch (e) {
    console.error("Failed to parse location response:", responseText, e);
    throw new Error("Invalid JSON response for location");
  }
}

export async function fetchMonthlyPanchangFromAPI(
  params: MonthlyPanchangParams
): Promise<MonthlyPanchangAPIResponse> {
  const response = await fetch(`${BASE_URL}/ExternalApi/SavePanchangDetails`, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json;",
    },
    body: JSON.stringify(params),
  });

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
  const response = await fetch(`${BASE_URL}/ExternalApi/SavePanchangDetails`, {
    method: "POST",
    headers: {
      ...commonHeaders,
      ...locationApiAuthHeader, // This endpoint seems to require auth
      "content-type": "application/json;",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch daily panchang: ${response.statusText}`);
  }
  return response.json() as Promise<DailyPanchangAPIResponse>;
}

export async function fetchEventTypeListFromAPI(
  params: EventTypeAPIParams
): Promise<EventTypeListItem[] | EventDetailsAPIResponse[]> {
  const response = await fetch(`${BASE_URL}/Donor/GetEventTypeList`, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch event type list: ${response.statusText}`);
  }
  return response.json();
}
