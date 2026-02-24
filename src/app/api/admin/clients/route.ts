import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")) {
    return NextResponse.json([], { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const clients = await db.user.findMany({
    where: {
      role: "CLIENT",
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          bookedSessions: true,
          workouts: true,
          personalRecords: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}
