import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const group = searchParams.get("group") || "";

    const where: Record<string, unknown> = {};
    if (q) where.name = { contains: q };
    if (group) where.muscleGroup = group;

    const exercises = await db.exercise.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(exercises);
  } catch (err) {
    console.error("Failed to fetch exercises:", err);
    return NextResponse.json([], { status: 500 });
  }
}
