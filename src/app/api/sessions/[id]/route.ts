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
  const { status, notes } = await req.json();

  const trainingSession = await db.trainingSession.findUnique({ where: { id } });
  if (!trainingSession) return NextResponse.json({}, { status: 404 });

  // Clients can only cancel their own sessions
  if (session.user.role === "CLIENT") {
    if (trainingSession.clientId !== session.user.id) {
      return NextResponse.json({}, { status: 403 });
    }
    if (status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Clients can only cancel sessions" },
        { status: 403 }
      );
    }
  }

  const updated = await db.trainingSession.update({
    where: { id },
    data: { status, notes },
  });

  appendToSheet("Sessions", [new Date().toISOString(), "UPDATED", id, trainingSession.clientId, trainingSession.trainerId, status, notes]);

  return NextResponse.json(updated);
}
