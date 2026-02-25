import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("GET /api/workouts/[id] — id:", id);
    const workout = await db.workout.findFirst({
      where: { id },
      include: {
        sets: {
          include: { exercise: { select: { name: true, muscleGroup: true } } },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });

    if (!workout) {
      console.log("GET /api/workouts/[id] — not found for id:", id);
      return NextResponse.json({ error: "not found", id }, { status: 404 });
    }
    return NextResponse.json(workout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/workouts/[id] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const workout = await db.workout.update({
    where: { id },
    data: {
      completedAt: body.completed ? new Date() : undefined,
      notes: body.notes,
      name: body.name,
    },
  });

  return NextResponse.json(workout);
}
