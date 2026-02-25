import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    const exercises = await db.exercise.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      ok: true,
      authed: !!session?.user,
      userId: session?.user?.id || null,
      count: exercises.length,
      exercises: exercises.map((e) => e.name),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
