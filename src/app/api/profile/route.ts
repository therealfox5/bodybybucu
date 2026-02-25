import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { upsertUserRow } from "@/lib/google-sheets";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, instagram: true, role: true, image: true },
  });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { name, phone, image, email, instagram } = await req.json();
  const data: Record<string, unknown> = { name, phone };
  if (typeof image === "string") data.image = image;
  if (typeof email === "string" && email) data.email = email;
  if (typeof instagram === "string") data.instagram = instagram;
  await db.user.update({
    where: { id: session.user.id },
    data,
  });

  // Update the user's row in the Users sheet (same row created at registration)
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { createdAt: true, role: true } });
  upsertUserRow(session.user.id, [session.user.id, name, email, phone, instagram, user?.role || "CLIENT", user?.createdAt?.toISOString() || ""]);

  return NextResponse.json({ success: true });
}
