import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const group = searchParams.get("group") || "";

  const exercises = await db.exercise.findMany({
    where: {
      ...(q ? { name: { contains: q } } : {}),
      ...(group ? { muscleGroup: group } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}
