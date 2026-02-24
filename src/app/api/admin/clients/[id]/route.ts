import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")) {
    return NextResponse.json({}, { status: 403 });
  }

  const { id } = await params;

  const [user, weightEntries, measurementEntries, prs, sessions, workouts] =
    await Promise.all([
      db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      db.weightEntry.findMany({
        where: { userId: id },
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.measurementEntry.findMany({
        where: { userId: id },
        orderBy: { date: "desc" },
        take: 10,
      }),
      db.personalRecord.findMany({
        where: { userId: id },
        orderBy: { date: "desc" },
        include: { exercise: { select: { name: true } } },
      }),
      db.trainingSession.findMany({
        where: { clientId: id },
        orderBy: { date: "desc" },
        take: 20,
        include: { trainer: { select: { name: true } } },
      }),
      db.workout.findMany({
        where: { userId: id },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          sets: {
            include: { exercise: { select: { name: true } } },
          },
        },
      }),
    ]);

  if (!user) return NextResponse.json({}, { status: 404 });

  return NextResponse.json({
    user,
    weightEntries,
    measurementEntries,
    prs,
    sessions,
    workouts,
  });
}
