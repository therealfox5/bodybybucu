import { google } from "googleapis";
import { waitUntil } from "@vercel/functions";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;

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
