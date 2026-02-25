import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("setup") === "headers") {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!email || !rawKey || !spreadsheetId) return NextResponse.json({ error: "missing env" }, { status: 500 });

    const key = rawKey.startsWith("LS0t") ? Buffer.from(rawKey, "base64").toString("utf8") : rawKey.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    const headers: Record<string, string[]> = {
      Users: ["ID", "Name", "Email", "Phone", "Instagram", "Role", "Registered"],
      Workouts: ["Timestamp", "Action", "Workout ID", "User ID", "Name"],
      ExerciseSets: ["Timestamp", "Action", "User ID", "Set ID", "Workout ID", "Exercise ID", "Set #", "Reps", "Weight", "Duration", "Variant", "Is PR"],
      Weight: ["Timestamp", "Action", "Entry ID", "User ID", "Weight", "Date", "Notes"],
      Measurements: ["Timestamp", "Action", "Entry ID", "User ID", "Date", "Neck", "Chest", "Left Arm", "Waist", "Left Thigh", "Notes"],
      Sessions: ["Timestamp", "Action", "Session ID", "User ID", "Trainer ID", "Date", "Type", "Duration", "Status"],
      CheckIns: ["Timestamp", "Action", "Check-In ID", "User ID", "Latitude", "Longitude"],
    };

    const results: Record<string, string> = {};
    for (const [sheet, row] of Object.entries(headers)) {
      try {
        const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheet}!A1:A1` });
        if (existing.data.values?.[0]?.[0] === row[0]) {
          results[sheet] = "already has headers";
          continue;
        }
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheet}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] },
        });
        results[sheet] = "headers added";
      } catch (e: unknown) {
        results[sheet] = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json({ ok: true, results });
  }

  return NextResponse.json({ ok: true });
}
