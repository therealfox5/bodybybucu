import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, role: true, image: true },
  });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { name, phone, image } = await req.json();
  const data: Record<string, unknown> = { name, phone };
  if (typeof image === "string") data.image = image;
  await db.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ success: true });
}
