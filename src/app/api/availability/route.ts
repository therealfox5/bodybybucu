import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const availability = await db.availability.findMany({
    where: { isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(availability);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")) {
    return NextResponse.json({}, { status: 403 });
  }

  const body = await req.json();
  const { dayOfWeek, startTime, endTime, slotMinutes } = body;

  const availability = await db.availability.create({
    data: {
      trainerId: session.user.id,
      dayOfWeek,
      startTime,
      endTime,
      slotMinutes: slotMinutes || 60,
    },
  });

  return NextResponse.json(availability, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")) {
    return NextResponse.json({}, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({}, { status: 400 });

  await db.availability.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
