import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  const user = await db.user.findUnique({ where: { id: session.user.id } });

  if (!user?.hashedPassword) {
    return NextResponse.json(
      { error: "Account uses social login" },
      { status: 400 }
    );
  }

  const valid = await compare(currentPassword, user.hashedPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const hashed = await hash(newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { hashedPassword: hashed },
  });

  return NextResponse.json({ success: true });
}
