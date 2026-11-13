import { google } from "googleapis";

/**
 * Read-only access to the "Body by Bucu Hour Sessions" Google Calendar.
 * Uses the same service account as the Sheets integration; the calendar must be
 * shared with it ("See all event details") and the Google Calendar API enabled.
 *
 * Env: GOOGLE_CALENDAR_ID (defaults to the gym calendar),
 *      GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY.
 */

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "bodybybucu@gmail.com";

export type CalendarStatus = "SCHEDULED" | "LATE" | "NO_SHOW";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd (gym local time)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: CalendarStatus; // from event colour: orange = late, red = no show
  isClassPass: boolean; // title contains "CP"
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
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

// Google Calendar event colours: 11 = red (no-show), 6 = orange (late)
function statusFromColor(colorId?: string | null): CalendarStatus {
  if (colorId === "11") return "NO_SHOW";
  if (colorId === "6") return "LATE";
  return "SCHEDULED";
}

/**
 * Events whose local (gym-time) date falls between start and end, inclusive.
 * start/end are yyyy-MM-dd.
 */
export async function getCalendarEvents(
  start: string,
  end: string
): Promise<{ events: CalendarEvent[]; error?: string }> {
  const auth = getAuth();
  if (!auth) return { events: [], error: "Google service account is not configured" };

  // Pad the window by a day each side, then filter on the local date string
  // so daylight-saving offsets can't push events into the wrong day.
  const timeMin = new Date(`${start}T00:00:00Z`);
  timeMin.setUTCDate(timeMin.getUTCDate() - 1);
  const timeMax = new Date(`${end}T00:00:00Z`);
  timeMax.setUTCDate(timeMax.getUTCDate() + 2);

  try {
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      timeZone: "America/New_York",
      maxResults: 250,
    });

    const events: CalendarEvent[] = [];
    for (const e of res.data.items || []) {
      const startDT = e.start?.dateTime;
      const endDT = e.end?.dateTime;
      if (!startDT || e.status === "cancelled") continue; // skip all-day + cancelled

      // dateTime comes back in America/New_York, e.g. 2026-11-14T08:00:00-05:00
      const date = startDT.slice(0, 10);
      if (date < start || date > end) continue;

      const title = (e.summary || "(no title)").trim();
      events.push({
        id: e.id || `${date}-${title}`,
        title,
        date,
        startTime: startDT.slice(11, 16),
        endTime: (endDT || startDT).slice(11, 16),
        status: statusFromColor(e.colorId),
        isClassPass: /\bCP\b/i.test(title),
      });
    }
    return { events };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Calendar] read failed:", message);
    return { events: [], error: message };
  }
}
