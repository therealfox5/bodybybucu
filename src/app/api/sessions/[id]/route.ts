import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appendToSheet } from "@/lib/google-sheets";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const trainingSession = await db.trainingSession.findUnique({ where: { id } });
  if (!trainingSession) return NextResponse.json({}, { status: 404 });

  // Clients can only cancel their own sessions
  if (session.user.role === "CLIENT") {
    if (trainingSession.clientId !== session.user.id) {
      return NextResponse.json({}, { status: 403 });
    }
    if (body.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Clients can only cancel sessions" },
        { status: 403 }
      );
    }
  }

  // Build dynamic update data
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  // Admin/Trainer can also update date, type, duration
  if (session.user.role === "ADMIN" || session.user.role === "TRAINER") {
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.type !== undefined) data.type = body.type;
    if (body.duration !== undefined) data.duration = body.duration;
  }

  const updated = await db.trainingSession.update({
    where: { id },
    data,
  });

  appendToSheet("Sessions", [new Date().toISOString(), "UPDATED", id, trainingSession.clientId, trainingSession.trainerId, updated.date?.toISOString(), updated.type, updated.duration, updated.status, updated.notes]);

  return NextResponse.json(updated);
}
