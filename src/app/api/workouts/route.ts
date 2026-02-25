import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const workouts = await db.workout.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: {
      sets: {
        include: { exercise: { select: { name: true, muscleGroup: true } } },
        orderBy: { setNumber: "asc" },
      },
    },
  });

  return NextResponse.json(workouts);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log("POST /api/workouts — authed:", !!session?.user, "userId:", session?.user?.id);
    if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { name } = await req.json();

    const workout = await db.workout.create({
      data: {
        userId: session.user.id,
        name: name || `Workout ${new Date().toLocaleDateString()}`,
      },
    });

    console.log("POST /api/workouts — created:", workout.id);

    return NextResponse.json(workout, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/workouts error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
