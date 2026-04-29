import { NextRequest, NextResponse } from "next/server";
import { getNearbyPujas } from "@/lib/panchang/pujas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  return NextResponse.json({ pujas: list, count: list.length });
}
