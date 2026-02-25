import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appendToSheet } from "@/lib/google-sheets";

function computeEpley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function isTimedExercise(name: string): boolean {
  return name.includes("Mile Time");
}

function isBodyweightExercise(name: string): boolean {
  return name === "Push Ups" || name === "Pull Ups";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { id: workoutId } = await params;
  const body = await req.json();
  const { exerciseId, setNumber, reps, weight, duration, variant } = body;

  // Create the set
  const set = await db.exerciseSet.create({
    data: {
      workoutId,
      exerciseId,
      setNumber,
      reps: reps ?? null,
      weight: weight ?? null,
      duration: duration ?? null,
      variant: variant ?? null,
    },
  });

  // Fetch exercise info for PR detection
  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
  });

  let isPR = false;

  if (exercise) {
    if (isTimedExercise(exercise.name) && duration) {
      // Timed PR: lower duration = better
      const existingPR = await db.personalRecord.findFirst({
        where: { userId: session.user.id, exerciseId },
        orderBy: { estimated1RM: "asc" },
      });

      if (!existingPR || duration < (existingPR.estimated1RM || Infinity)) {
        isPR = true;
        await db.personalRecord.create({
          data: {
            userId: session.user.id,
            exerciseId,
            weight: duration,
            reps: 1,
            estimated1RM: duration,
          },
        });
        await db.exerciseSet.update({
          where: { id: set.id },
          data: { isPR: true },
        });
      }
    } else if (isBodyweightExercise(exercise.name) && reps) {
      // Bodyweight PR: higher reps = better
      const existingPR = await db.personalRecord.findFirst({
        where: { userId: session.user.id, exerciseId },
        orderBy: { estimated1RM: "desc" },
      });

      if (!existingPR || reps > (existingPR.estimated1RM || 0)) {
        isPR = true;
        await db.personalRecord.create({
          data: {
            userId: session.user.id,
            exerciseId,
            weight: 0,
            reps,
            estimated1RM: reps,
          },
        });
        await db.exerciseSet.update({
          where: { id: set.id },
          data: { isPR: true },
        });
      }
    } else if (weight && reps) {
      // Standard PR: higher estimated 1RM = better
      const estimated1RM = computeEpley1RM(weight, reps);

      const existingPR = await db.personalRecord.findFirst({
        where: { userId: session.user.id, exerciseId },
        orderBy: { estimated1RM: "desc" },
      });

      if (!existingPR || estimated1RM > (existingPR.estimated1RM || 0)) {
        isPR = true;
        await db.personalRecord.create({
          data: {
            userId: session.user.id,
            exerciseId,
            weight,
            reps,
            estimated1RM,
          },
        });
        await db.exerciseSet.update({
          where: { id: set.id },
          data: { isPR: true },
        });
      }
    }
  }

  appendToSheet("ExerciseSets", [new Date().toISOString(), "CREATED", set.id, workoutId, exerciseId, setNumber, reps, weight, duration, variant, isPR]);

  return NextResponse.json({ ...set, isPR }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /sets error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { id: workoutId } = await params;
  const body = await req.json();
  const { setId, reps, weight, duration, variant } = body;

  // Verify the set belongs to this workout
  const existingSet = await db.exerciseSet.findFirst({
    where: { id: setId, workoutId },
    include: { exercise: true },
  });

  if (!existingSet) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  // Update the set
  const updated = await db.exerciseSet.update({
    where: { id: setId },
    data: {
      reps: reps ?? null,
      weight: weight ?? null,
      duration: duration ?? null,
      variant: variant !== undefined ? (variant ?? null) : undefined,
      isPR: false, // Reset PR flag; re-detect below
    },
  });

  // Re-run PR detection
  let isPR = false;
  const exercise = existingSet.exercise;

  if (isTimedExercise(exercise.name) && duration) {
    const existingPR = await db.personalRecord.findFirst({
      where: { userId: session.user.id, exerciseId: exercise.id },
      orderBy: { estimated1RM: "asc" },
    });

    if (!existingPR || duration < (existingPR.estimated1RM || Infinity)) {
      isPR = true;
      await db.personalRecord.create({
        data: {
          userId: session.user.id,
          exerciseId: exercise.id,
          weight: duration,
          reps: 1,
          estimated1RM: duration,
        },
      });
      await db.exerciseSet.update({
        where: { id: setId },
        data: { isPR: true },
      });
    }
  } else if (isBodyweightExercise(exercise.name) && reps) {
    // Bodyweight PR: higher reps = better
    const existingPR = await db.personalRecord.findFirst({
      where: { userId: session.user.id, exerciseId: exercise.id },
      orderBy: { estimated1RM: "desc" },
    });

    if (!existingPR || reps > (existingPR.estimated1RM || 0)) {
      isPR = true;
      await db.personalRecord.create({
        data: {
          userId: session.user.id,
          exerciseId: exercise.id,
          weight: 0,
          reps,
          estimated1RM: reps,
        },
      });
      await db.exerciseSet.update({
        where: { id: setId },
        data: { isPR: true },
      });
    }
  } else if (weight && reps) {
    const estimated1RM = computeEpley1RM(weight, reps);

    const existingPR = await db.personalRecord.findFirst({
      where: { userId: session.user.id, exerciseId: exercise.id },
      orderBy: { estimated1RM: "desc" },
    });

    if (!existingPR || estimated1RM > (existingPR.estimated1RM || 0)) {
      isPR = true;
      await db.personalRecord.create({
        data: {
          userId: session.user.id,
          exerciseId: exercise.id,
          weight,
          reps,
          estimated1RM,
        },
      });
      await db.exerciseSet.update({
        where: { id: setId },
        data: { isPR: true },
      });
    }
  }

  appendToSheet("ExerciseSets", [new Date().toISOString(), "UPDATED", setId, workoutId, exercise.id, reps, weight, duration, variant, isPR]);

  return NextResponse.json({ ...updated, isPR });
}
