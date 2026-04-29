import { NextRequest, NextResponse } from "next/server";
import { getEventList, getEventDetailsForId } from "@/lib/panchang/events";
import { parse, isValid } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// spmode "0" -> list events; "1" -> details for one event_id.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const spmode = body?.spmode;
  const eventDateStr: string = body?.event_date || "";

  const tryParse = (fmt: string) => parse(eventDateStr, fmt, new Date());
  let baseDate = tryParse("dd-MMM-yyyy");
  if (!isValid(baseDate)) baseDate = tryParse("dd/MMM/yyyy");
  if (!isValid(baseDate)) baseDate = new Date();

  if (spmode === "0") {
    const list = getEventList();
    return NextResponse.json(list);
  }

  if (spmode === "1") {
    const eventId = parseInt(body?.event_id, 10);
    if (Number.isNaN(eventId)) return NextResponse.json([]);
    const detail = getEventDetailsForId(eventId, baseDate);
    return NextResponse.json(detail ? [detail] : []);
  }

  return NextResponse.json([]);
}
