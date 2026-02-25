import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!email || !rawKey || !spreadsheetId) {
      return NextResponse.json({ ok: false, error: "missing env", hasEmail: !!email, hasKey: !!rawKey, hasSheet: !!spreadsheetId });
    }

    const key = rawKey.startsWith("LS0t")
      ? Buffer.from(rawKey, "base64").toString("utf8")
      : rawKey.replace(/\\n/g, "\n");

    const keyPreview = key.substring(0, 40) + "..." + key.substring(key.length - 40);

    const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Profiles!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[new Date().toISOString(), "DEBUG_TEST", "from-vercel"]] },
    });

    return NextResponse.json({ ok: true, status: result.status, keyPreview });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split("\n").slice(0, 3).join(" | ") : "";
    return NextResponse.json({ ok: false, error: message, stack }, { status: 500 });
  }
}
