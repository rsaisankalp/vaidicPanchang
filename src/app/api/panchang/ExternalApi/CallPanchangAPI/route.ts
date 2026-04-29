// Frontend uses this endpoint as a fallback for daily panchang (spmode=1).
// Identical handler to SavePanchangDetails but defined separately because
// Next.js does not allow re-exporting route handlers.
import { NextRequest, NextResponse } from "next/server";
import { calculatePanchang } from "@/lib/panchang/calculator";
import { calculateMonthlyPanchang } from "@/lib/panchang/monthly";
import { parse } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { birth_date_, lat_, lon_, tzone_, panchang_type, lang_ } = body || {};
  const lat = parseFloat(lat_);
  const lng = parseFloat(lon_);
  const tz = parseFloat(tzone_);
  const date = parse(birth_date_, "dd-MM-yyyy", new Date());
  if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(tz) || isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  if (panchang_type === "2") {
    return NextResponse.json({ table: calculateMonthlyPanchang(date, lat, lng, tz) });
  }
  const r = calculatePanchang({ date, lat, lng, tzOffsetHours: tz, language: lang_ || "hi" });
  return NextResponse.json({
    table: [r.detail],
    table1: r.table1, table2: r.table2, table3: r.table3, table4: r.table4, table5: r.table5,
  });
}
