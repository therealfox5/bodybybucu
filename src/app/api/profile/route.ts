import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appendToSheet } from "@/lib/google-sheets";

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

  const { name, phone, image, email } = await req.json();
  const data: Record<string, unknown> = { name, phone };
  if (typeof image === "string") data.image = image;
  if (typeof email === "string" && email) data.email = email;
  await db.user.update({
    where: { id: session.user.id },
    data,
  });

  appendToSheet("Profiles", [new Date().toISOString(), "UPDATED", session.user.id, name, phone, email, image]);

  return NextResponse.json({ success: true });
}
