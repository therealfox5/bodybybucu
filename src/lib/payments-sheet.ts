import { google } from "googleapis";
import { unstable_cache } from "next/cache";

/**
 * Live read of the "BodyByBucu_Payments" Google Sheet (main tab).
 * Columns: A Name, B Monthly Rate, C..N months (Dec..Nov), O Notes/Status, P Email, Q Phone.
 * Rows run from row 2 until the row whose name is "TOTAL".
 *
 * Env:
 *  - GOOGLE_PAYMENTS_SPREADSHEET_ID (falls back to the Body by Bucu payments sheet)
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY (same service account as google-sheets.ts;
 *    the payments sheet must be shared with that account as Viewer)
 */

const PAYMENTS_SHEET_ID =
  process.env.GOOGLE_PAYMENTS_SPREADSHEET_ID ||
  "1WSkicddBMgXGByQsAL1CIRBIUznjXSTVSw3p_KJaqZU";
const MAIN_TAB = "BodyByBucu_Payments";

export interface MonthPayment {
  label: string; // "November 2026"
  amount: number;
}

export interface PaymentClient {
  name: string;
  rate: string;
  status: string;
  email: string;
  phone: string; // digits only, last 10
  phoneDisplay: string;
  months: MonthPayment[]; // months with a positive payment, oldest -> newest
  lastPaid: MonthPayment | null;
  totalPaid: number;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.startsWith("LS0t")
    ? Buffer.from(rawKey, "base64").toString("utf8")
    : rawKey.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export function normalizePhone(p: string | null | undefined): string {
  const digits = (p || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function parseMoney(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const neg = s.startsWith("-") || s.startsWith("(");
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return 0;
  return neg ? -n : n;
}

// Sheet months run Dec (2025) through Nov (2026)
function monthLabel(header: string): string {
  const name = header.trim();
  const year = name.toLowerCase().startsWith("dec") ? 2025 : 2026;
  return `${name} ${year}`;
}

async function fetchPaymentClients(): Promise<PaymentClient[]> {
  const auth = getAuth();
  if (!auth) return [];

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: PAYMENTS_SHEET_ID,
    range: `${MAIN_TAB}!A1:Q80`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const header = rows[0];
  const clients: PaymentClient[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = String(row[0] ?? "").trim();
    if (!name) continue;
    if (name.toUpperCase() === "TOTAL") break;

    const months: MonthPayment[] = [];
    for (let c = 2; c <= 13; c++) {
      const amount = parseMoney(row[c]);
      // negative amounts mean "not paid yet" in the sheet
      if (amount > 0 && header[c]) {
        months.push({ label: monthLabel(String(header[c])), amount });
      }
    }

    const phone = normalizePhone(String(row[16] ?? ""));
    clients.push({
      name,
      rate: String(row[1] ?? "").trim(),
      status: String(row[14] ?? "").trim(),
      email: String(row[15] ?? "").trim().toLowerCase(),
      phone,
      phoneDisplay: String(row[16] ?? "").trim(),
      months,
      lastPaid: months.length ? months[months.length - 1] : null,
      totalPaid: months.reduce((sum, m) => sum + m.amount, 0),
    });
  }

  return clients;
}

/** Cached for 5 minutes so the app doesn't hit the Sheets API on every page view. */
export const getPaymentClients = unstable_cache(
  async () => {
    try {
      return await fetchPaymentClients();
    } catch (err) {
      console.error(
        "[Payments sheet] read failed:",
        err instanceof Error ? err.message : err
      );
      return [] as PaymentClient[];
    }
  },
  ["payments-sheet-clients"],
  { revalidate: 300 }
);

/**
 * Match an app user to a sheet row. Only exact email or phone matches count —
 * never name — so one client can't see another client's payments.
 */
export function findPaymentClientFor(
  clients: PaymentClient[],
  user: { email?: string | null; phone?: string | null }
): PaymentClient | null {
  const email = (user.email || "").trim().toLowerCase();
  const phone = normalizePhone(user.phone);
  return (
    clients.find(
      (c) => (email && c.email === email) || (phone && c.phone === phone)
    ) || null
  );
}
