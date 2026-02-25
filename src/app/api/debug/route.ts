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

    const startsCorrectly = key.startsWith("-----BEGIN PRIVATE KEY-----");
    const endsCorrectly = key.trimEnd().endsWith("-----END PRIVATE KEY-----");
    const keyLen = key.length;
    const rawKeyLen = rawKey.length;
    const hasRealNewlines = key.includes("\n");

    const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Profiles!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[new Date().toISOString(), "DEBUG_TEST", "from-vercel"]] },
    });

    return NextResponse.json({ ok: true, status: result.status });
  } catch (err: unknown) {
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
    const key = rawKey.startsWith("LS0t")
      ? Buffer.from(rawKey, "base64").toString("utf8")
      : rawKey.replace(/\\n/g, "\n");

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: message,
      keyDiag: {
        rawLen: rawKey.length,
        decodedLen: key.length,
        startsOk: key.startsWith("-----BEGIN PRIVATE KEY-----"),
        endsOk: key.trimEnd().endsWith("-----END PRIVATE KEY-----"),
        hasNewlines: key.includes("\n"),
        first30: key.substring(0, 30),
        isBase64: rawKey.startsWith("LS0t"),
      },
    }, { status: 500 });
  }
}
