import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parse,
  addMinutes,
  isBefore,
} from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("week")
    ? new Date(searchParams.get("week")!)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // Get all availability rules
  const availability = await db.availability.findMany({
    where: { isActive: true },
  });

  // Get all booked sessions for this week
  const bookedSessions = await db.trainingSession.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      status: { in: ["BOOKED", "COMPLETED"] },
    },
    select: { trainerId: true, date: true },
  });

  const bookedSet = new Set(
    bookedSessions.map(
      (s) => `${s.trainerId}_${format(new Date(s.date), "yyyy-MM-dd_HH:mm")}`
    )
  );

  // Generate slots for each day of the week
  const slots: {
    trainerId: string;
    date: string;
    time: string;
    available: boolean;
  }[] = [];

  for (const rule of availability) {
    const dayDate = addDays(weekStart, rule.dayOfWeek); // 0=Mon if weekStartsOn=1

    let currentTime = parse(rule.startTime, "HH:mm", dayDate);
    const endTime = parse(rule.endTime, "HH:mm", dayDate);

    // Determine if booking is open for this week.
    // Booking opens Saturday 6 PM of the prior week (relative to weekStart's Mon-Sun).
    const now = new Date();
    // weekStart is Monday; the preceding Saturday is 2 days before
    const priorSaturday = addDays(weekStart, -2);
    const bookingOpensAt = new Date(priorSaturday);
    bookingOpensAt.setHours(18, 0, 0, 0);
    const bookingOpen = now >= bookingOpensAt;

    while (isBefore(currentTime, endTime)) {
      const dateStr = format(dayDate, "yyyy-MM-dd");
      const timeStr = format(currentTime, "HH:mm");
      const key = `${rule.trainerId}_${dateStr}_${timeStr}`;

      const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
      const isPast = slotDateTime <= now;

      slots.push({
        trainerId: rule.trainerId,
        date: `${dateStr}T${timeStr}:00`,
        time: timeStr,
        available: !bookedSet.has(key) && !isPast && bookingOpen,
      });

      currentTime = addMinutes(currentTime, rule.slotMinutes);
    }
  }

  return NextResponse.json(slots);
}
