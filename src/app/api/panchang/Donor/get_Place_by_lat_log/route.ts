import { NextRequest, NextResponse } from "next/server";
import { tz_lookup } from "@/lib/panchang/tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reverse-geocodes via OpenStreetMap Nominatim (free, no API key) and shapes
// the result to LocationAPIResponse expected by the frontend.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const lat = parseFloat(body.latitude);
  const lon = parseFloat(body.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
  }

  let nom: any = null;
  try {
    const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`;
    const res = await fetch(u, { headers: { "User-Agent": "vaidicPanchang/1.0" } });
    if (res.ok) nom = await res.json();
  } catch { /* best-effort */ }

  const addr = nom?.address || {};
  const tz = tz_lookup(lat, lon);

  const result = {
    name: addr.attraction || addr.suburb || addr.city || addr.town || addr.village || "",
    country: addr.country || "",
    country_code: (addr.country_code || "").toUpperCase(),
    state: addr.state || "",
    state_code: addr.state_code || "",
    county: addr.county || "",
    city: addr.city || addr.town || addr.village || "",
    postcode: addr.postcode || "",
    district: addr.state_district || "",
    suburb: addr.suburb || "",
    street: addr.road || "",
    lon, lat,
    formatted: nom?.display_name || `${lat},${lon}`,
    address_line1: addr.road || addr.suburb || "",
    address_line2: [addr.city, addr.state, addr.country].filter(Boolean).join(", "),
    timezone: {
      name: tz.name,
      offset_STD: tz.offset_STD,
      offset_STD_seconds: tz.offset_STD_seconds,
      offset_DST: tz.offset_STD,
      offset_DST_seconds: tz.offset_STD_seconds,
      abbreviation_STD: tz.abbreviation,
      abbreviation_DST: tz.abbreviation,
    },
    place_id: nom?.place_id?.toString() || "",
  };

  return NextResponse.json({
    results: [result],
    query: { lat, lon, plus_code: "" },
  });
}
