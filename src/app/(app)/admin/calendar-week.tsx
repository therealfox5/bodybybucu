"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function CalendarWeek() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [appSessions, setAppSessions] = useState<AppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monday through Saturday (no Sundays)
  const days = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    let cancelled = false;
    const start = format(days[0], "yyyy-MM-dd");
    const end = format(days[5], "yyyy-MM-dd");
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/admin/calendar?start=${start}&end=${end}`).then((r) => r.json()),
      fetch(`/api/sessions?start=${start}&end=${format(addDays(days[5], 1), "yyyy-MM-dd")}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([cal, sessions]) => {
        if (cancelled) return;
        setEvents(cal.events || []);
        if (cal.error) setError(cal.error);
        setAppSessions(
          Array.isArray(sessions)
            ? sessions.filter((s: AppSession) => s.status === "BOOKED")
            : []
        );
      })
      .catch(() => !cancelled && setError("Couldn't load the calendar"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [days]);

  const rowsByDay = useMemo(() => {
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

    const map: Record<string, Row[]> = {};
    for (const r of [...calRows, ...appRows]) {
      (map[r.date] ||= []).push(r);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [events, appSessions]);

  const today = format(new Date(), "yyyy-MM-dd");
  const total = days.reduce((n, d) => n + (rowsByDay[format(d, "yyyy-MM-dd")]?.length || 0), 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Calendar · {total} session{total === 1 ? "" : "s"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
            <span className="min-w-[8.5rem] text-center text-sm">
              {format(days[0], "MMM d")} – {format(days[5], "MMM d")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />Scheduled / showed</span>
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
        ) : (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const rows = rowsByDay[key] || [];
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border border-border p-2",
                    key === today && "border-brand"
                  )}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE")} <span className="text-foreground">{format(day, "MMM d")}</span>
                  </p>
                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sessions</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rows.map((r) => (
                        <div
                          key={r.key}
                          className={cn(
                            "rounded-md border-l-4 bg-secondary/40 px-2 py-1.5",
                            statusStyle[r.status]
                          )}
                        >
                          <p className="text-[11px] text-muted-foreground">
                            {formatTime(r.startTime)}
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
