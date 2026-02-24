import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const measurementSchema = z.object({
  date: z.string().optional(),
  neck: z.number().optional(),
  chest: z.number().optional(),
  leftArm: z.number().optional(),
  waist: z.number().optional(),
  leftThigh: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const entries = await db.measurementEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 50,
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  const data = measurementSchema.parse(body);

  const entry = await db.measurementEntry.create({
    data: {
      userId: session.user.id,
      date: data.date ? new Date(data.date) : new Date(),
      neck: data.neck,
      chest: data.chest,
      leftArm: data.leftArm,
      waist: data.waist,
      leftThigh: data.leftThigh,
      notes: data.notes,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

const updateMeasurementSchema = measurementSchema.extend({
  id: z.string(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  const { id, ...data } = updateMeasurementSchema.parse(body);

  const existing = await db.measurementEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.measurementEntry.update({
    where: { id },
    data: {
      neck: data.neck ?? null,
      chest: data.chest ?? null,
      leftArm: data.leftArm ?? null,
      waist: data.waist ?? null,
      leftThigh: data.leftThigh ?? null,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await db.measurementEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.measurementEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
