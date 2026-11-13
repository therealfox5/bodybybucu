"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "LATE" | "NO_SHOW";
  isClassPass: boolean;
}

interface AppSession {
  id: string;
  date: string;
  status: string;
  type: string;
  duration: number;
  client: { name: string; email: string };
}

interface Row {
  key: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  status: CalEvent["status"];
  isClassPass: boolean;
  source: "calendar" | "app";
}

/** DB stores Eastern times as UTC values — read the UTC parts as gym time. */
function appSessionToRow(s: AppSession): Row {
  const d = new Date(s.date);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const startTime = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const endMin = d.getUTCHours() * 60 + d.getUTCMinutes() + (s.duration || 60);
  const endTime = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;
  return {
    key: `app-${s.id}`,
    date,
    startTime,
    endTime,
    title: s.client?.name || s.client?.email || "Unknown",
    status: "SCHEDULED",
    isClassPass: false,
    source: "app",
  };
}

const statusStyle: Record<CalEvent["status"], string> = {
  SCHEDULED: "border-l-blue-400",
  LATE: "border-l-orange-400",
  NO_SHOW: "border-l-red-500",
};

function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return format(d, m === 0 ? "h a" : "h:mm a");
}

const WINDOW_MINUTES = 120;
const GYM_TZ = "America/New_York";

/** Current gym wall-clock time as a naive Date (so it compares with event times). */
function gymNow(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GYM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

function naive(date: string, hhmm: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, m);
}

/** Sessions happening in the next two hours (including one already in progress). */
export function CalendarWeek() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [appSessions, setAppSessions] = useState<AppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => gymNow());

  const load = useCallback(async () => {
    const current = gymNow();
    const today = format(current, "yyyy-MM-dd");
    const tomorrow = format(addDays(current, 1), "yyyy-MM-dd");
    try {
      const [cal, sessions] = await Promise.all([
        fetch(`/api/admin/calendar?start=${today}&end=${tomorrow}`).then((r) => r.json()),
        fetch(`/api/sessions?start=${today}&end=${format(addDays(current, 2), "yyyy-MM-dd")}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);
      setEvents(cal.events || []);
      setError(cal.error || null);
      setAppSessions(
        Array.isArray(sessions)
          ? sessions.filter((s: AppSession) => s.status === "BOOKED")
          : []
      );
    } catch {
      setError("Couldn't load the calendar");
    } finally {
      setLoading(false);
      setNow(gymNow());
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 60_000); // keep the window current
    return () => clearInterval(refresh);
  }, [load]);

  const upcoming = useMemo(() => {
    const calRows: Row[] = events.map((e) => ({
      key: `cal-${e.id}`,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      title: e.title,
      status: e.status,
      isClassPass: e.isClassPass,
      source: "calendar",
    }));

    // App bookings that aren't already on the calendar (same slot + same first name)
    const appRows = appSessions
      .map(appSessionToRow)
      .filter(
        (a) =>
          !calRows.some(
            (c) =>
              c.date === a.date &&
              c.startTime === a.startTime &&
              c.title.toLowerCase().startsWith(a.title.split(" ")[0].toLowerCase())
          )
      );

    const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60_000);
    return [...calRows, ...appRows]
      .filter((r) => {
        const start = naive(r.date, r.startTime);
        const end = naive(r.date, r.endTime);
        return start <= windowEnd && end > now; // starts within 2h, or still in progress
      })
      .sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
      );
  }, [events, appSessions, now]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Next 2 hours · {upcoming.length} session{upcoming.length === 1 ? "" : "s"}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />Late</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />No-show</span>
          <Badge className="bg-brand text-white text-[10px]">ClassPass</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <p className="mb-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            Couldn&apos;t read Google Calendar ({error}). Check that the calendar is shared with
            the service account and the Calendar API is enabled.
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions in the next 2 hours</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((r) => {
              const inProgress = naive(r.date, r.startTime) <= now;
              return (
                <div
                  key={r.key}
                  className={cn("rounded-md border-l-4 bg-secondary/40 px-3 py-2", statusStyle[r.status])}
                >
                  <p className="text-[11px] text-muted-foreground">
                    {formatTime(r.startTime)} – {formatTime(r.endTime)}
                    {inProgress && <span className="ml-1.5 font-medium text-foreground">· in progress</span>}
                  </p>
                  <p className="text-sm font-medium leading-tight">{r.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.isClassPass && (
                      <Badge className="bg-brand text-white text-[10px]">ClassPass</Badge>
                    )}
                    {r.source === "app" && (
                      <Badge variant="outline" className="text-[10px]">App booking</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
