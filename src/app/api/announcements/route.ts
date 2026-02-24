import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const announcements = await db.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(announcements);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")) {
    return NextResponse.json({}, { status: 403 });
  }

  const { title, body, pinned } = await req.json();

  const announcement = await db.announcement.create({
    data: {
      authorId: session.user.id,
      title,
      body,
      pinned: pinned || false,
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({}, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({}, { status: 400 });

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
