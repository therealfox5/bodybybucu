import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appendToSheet } from "@/lib/google-sheets";

export async function GET() {
  try {
    const session = await auth();
    const exercises = await db.exercise.findMany({ orderBy: { name: "asc" } });

    const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
    const hasSheet = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    appendToSheet("Profiles", [new Date().toISOString(), "DEBUG_TEST", "test-user", "Test Name", "555-0000", "test@test.com", "", ""]);

    return NextResponse.json({
      ok: true,
      authed: !!session?.user,
      userId: session?.user?.id || null,
      count: exercises.length,
      sheets: { hasEmail, hasKey, hasSheet },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
