import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { upsertUserRow } from "@/lib/google-sheets";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.parse(body);
    const name = parsed.name;
    const email = parsed.email.toLowerCase();
    const password = parsed.password;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);
    const user = await db.user.create({
      data: { name, email, hashedPassword, role: "CLIENT" },
    });

    // Columns: ID | Name | Email | Phone | Instagram | Role | Registered
    upsertUserRow(user.id, [user.id, user.name, user.email, "", "", "CLIENT", new Date().toISOString()]);

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
