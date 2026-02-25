import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";
import { appendToSheet } from "@/lib/google-sheets";

const GYM_LAT = 40.679591;
const GYM_LNG = -74.2834154;
const MAX_DISTANCE_MILES = 0.25;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { lat, lng } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const distance = haversineDistance(lat, lng, GYM_LAT, GYM_LNG);
  if (distance > MAX_DISTANCE_MILES) {
    return NextResponse.json(
      { error: "You must be at the gym to check in" },
      { status: 403 }
    );
  }

  const now = new Date();
  const existing = await db.checkIn.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: startOfDay(now), lte: endOfDay(now) },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already checked in today" },
      { status: 409 }
    );
  }

  const checkIn = await db.checkIn.create({
    data: { userId: session.user.id },
  });

  appendToSheet("CheckIns", [new Date().toISOString(), "CREATED", checkIn.id, session.user.id, lat, lng]);

  return NextResponse.json(checkIn, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const checkIns = await db.checkIn.findMany({
    orderBy: { date: "desc" },
    take: 20,
    include: {
      user: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json(checkIns);
}
