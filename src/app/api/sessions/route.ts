import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appendToSheet } from "@/lib/google-sheets";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  const where: Record<string, unknown> = {};

  // Clients see their own sessions, admins see all
  if (session.user.role === "CLIENT") {
    where.clientId = session.user.id;
  }

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const sessions = await db.trainingSession.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      client: { select: { name: true, email: true } },
      trainer: { select: { name: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  const { trainerId, date, type, duration } = body;

  // Check if this client already booked this slot
  const existing = await db.trainingSession.findFirst({
    where: {
      trainerId,
      clientId: session.user.id,
      date: new Date(date),
      status: { in: ["BOOKED", "COMPLETED"] },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already booked this slot" },
      { status: 409 }
    );
  }

  const trainingSession = await db.trainingSession.create({
    data: {
      clientId: session.user.id,
      trainerId,
      date: new Date(date),
      type: type || "PERSONAL",
      duration: duration || 60,
    },
  });

  appendToSheet("Sessions", [new Date().toISOString(), "CREATED", trainingSession.id, session.user.id, trainerId, new Date(date).toISOString(), type || "PERSONAL", duration || 60, "BOOKED"]);

  return NextResponse.json(trainingSession, { status: 201 });
}
