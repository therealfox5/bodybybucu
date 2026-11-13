import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/calendar";

export async function GET(req: Request) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")
  ) {
    return NextResponse.json({ events: [] }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";
  const valid = /^\d{4}-\d{2}-\d{2}$/;
  if (!valid.test(start) || !valid.test(end)) {
    return NextResponse.json({ error: "start and end (yyyy-MM-dd) required" }, { status: 400 });
  }

  return NextResponse.json(await getCalendarEvents(start, end));
}
