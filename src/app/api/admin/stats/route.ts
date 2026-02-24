import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, subDays } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")) {
    return NextResponse.json({}, { status: 403 });
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thirtyDaysAgo = subDays(now, 30);

  const [
    totalClients,
    newClientsThisMonth,
    sessionsThisWeek,
    totalWorkouts,
    checkInsToday,
  ] = await Promise.all([
    db.user.count({ where: { role: "CLIENT" } }),
    db.user.count({
      where: { role: "CLIENT", createdAt: { gte: thirtyDaysAgo } },
    }),
    db.trainingSession.count({
      where: {
        date: { gte: weekStart, lte: weekEnd },
        status: { in: ["BOOKED", "COMPLETED"] },
      },
    }),
    db.workout.count({
      where: { completedAt: { not: null } },
    }),
    db.checkIn.count({
      where: { date: { gte: startOfDay(now), lte: endOfDay(now) } },
    }),
  ]);

  return NextResponse.json({
    totalClients,
    newClientsThisMonth,
    sessionsThisWeek,
    totalWorkouts,
    checkInsToday,
  });
}
