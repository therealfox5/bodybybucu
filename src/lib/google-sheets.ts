import { google } from "googleapis";
import { waitUntil } from "@vercel/functions";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) return null;

  // Key is stored as base64 to avoid newline issues in env vars
  const key = rawKey.startsWith("LS0t")
    ? Buffer.from(rawKey, "base64").toString("utf8")
    : rawKey.replace(/\\n/g, "\n");

  return new google.auth.JWT({ email, key, scopes: SCOPES });
}

export function appendToSheet(sheetName: string, row: (string | number | null | undefined)[]) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const auth = getAuth();
  if (!auth || !spreadsheetId) return;

  const sheets = google.sheets({ version: "v4", auth });

  const promise = sheets.spreadsheets.values
    .append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row.map((v) => (v === null || v === undefined ? "" : v))],
      },
    })
    .catch((err) => {
      console.error(`[Google Sheets] Failed to append to ${sheetName}:`, err.message);
    });

  waitUntil(promise);
}
