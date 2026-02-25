import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isTimedExercise(name: string): boolean {
  return name.includes("Mile Time");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const prs = await db.personalRecord.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    include: { exercise: { select: { name: true, muscleGroup: true } } },
  });

  // Group by exercise and return only the best per exercise
  const bestByExercise = new Map<
    string,
    (typeof prs)[0]
  >();
  for (const pr of prs) {
    const existing = bestByExercise.get(pr.exerciseId);
    if (!existing) {
      bestByExercise.set(pr.exerciseId, pr);
    } else if (isTimedExercise(pr.exercise.name)) {
      // Timed: lower is better (fewer seconds = faster)
      if ((pr.estimated1RM || Infinity) < (existing.estimated1RM || Infinity)) {
        bestByExercise.set(pr.exerciseId, pr);
      }
    } else {
      // Strength/bodyweight: higher is better
      if ((pr.estimated1RM || 0) > (existing.estimated1RM || 0)) {
        bestByExercise.set(pr.exerciseId, pr);
      }
    }
  }

  return NextResponse.json({
    all: prs,
    best: Array.from(bestByExercise.values()),
  });
}
