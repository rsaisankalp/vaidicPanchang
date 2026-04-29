import { NextRequest, NextResponse } from "next/server";
import { getNearbyPujas } from "@/lib/panchang/pujas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Strip ASCII control characters (some wa_events rows have literal newlines /
// tabs in `swamiji_details` or `event_venue`, which break JSON parsing in
// browsers). Compress remaining whitespace.
function clean(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const fromDate = searchParams.get("from") || undefined;
  const toDate = searchParams.get("to") || undefined;
  const city = searchParams.get("city") || undefined;
  const state = searchParams.get("state") || undefined;
  const radius = parseFloat(searchParams.get("radius") || "");
  const max = parseInt(searchParams.get("max") || "200", 10);

  const list = await getNearbyPujas({
    fromDate, toDate,
    userLat: Number.isFinite(lat) ? lat : undefined,
    userLng: Number.isFinite(lng) ? lng : undefined,
    city, state,
    radiusKm: Number.isFinite(radius) ? radius : undefined,
    maxResults: Number.isFinite(max) ? max : 200,
  });

  const sanitised = list.map((p) => {
    const out: any = { ...p };
    for (const k of Object.keys(out)) {
      if (typeof out[k] === "string") out[k] = clean(out[k]);
    }
    return out;
  });
  return NextResponse.json({ pujas: sanitised, count: sanitised.length });
}
