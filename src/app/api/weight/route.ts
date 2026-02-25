import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { appendToSheet } from "@/lib/google-sheets";

const weightSchema = z.object({
  weight: z.number().min(50).max(600),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const entries = await db.weightEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 90,
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  const { weight, date, notes } = weightSchema.parse(body);

  const entry = await db.weightEntry.create({
    data: {
      userId: session.user.id,
      weight,
      date: date ? new Date(date) : new Date(),
      notes,
    },
  });

  appendToSheet("Weight", [new Date().toISOString(), "CREATED", entry.id, session.user.id, weight, entry.date.toISOString(), notes]);

  return NextResponse.json(entry, { status: 201 });
}

const updateWeightSchema = z.object({
  id: z.string(),
  weight: z.number().min(50).max(600),
  notes: z.string().optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  const { id, weight, notes } = updateWeightSchema.parse(body);

  const existing = await db.weightEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.weightEntry.update({
    where: { id },
    data: { weight, notes: notes ?? null },
  });

  appendToSheet("Weight", [new Date().toISOString(), "UPDATED", id, session.user.id, weight, notes]);

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await db.weightEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.weightEntry.delete({ where: { id } });

  appendToSheet("Weight", [new Date().toISOString(), "DELETED", id, session.user.id]);

  return NextResponse.json({ success: true });
}
