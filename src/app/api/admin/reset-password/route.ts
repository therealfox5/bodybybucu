import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getPaymentClients,
  sheetPasswordFor,
} from "@/lib/payments-sheet";

/**
 * Admin/trainer reset of a client's password.
 * Body: { email: string, password?: string }
 * With no password, resets to the client's default (phone number from the sheet,
 * or 0000000000), which forces them to choose a new one at next sign-in.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TRAINER")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, password } = await req.json();
  const e = String(email || "").trim().toLowerCase();
  if (!e) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email: e } });
  if (!user) {
    return NextResponse.json(
      { error: "No app account yet — they'll be created at first sign-in" },
      { status: 404 }
    );
  }

  let newPassword = typeof password === "string" ? password.trim() : "";
  if (!newPassword) {
    const client = (await getPaymentClients()).find((c) => c.email === e);
    newPassword = client ? sheetPasswordFor(client) : "0000000000";
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { hashedPassword: await hash(newPassword, 12) },
  });
  return NextResponse.json({ success: true, password: newPassword });
}
