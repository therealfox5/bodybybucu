"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function toGymTime(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
}

interface Session {
  id: string;
  date: string;
  status: string;
  type: string;
  duration: number;
  client: { name: string; email: string };
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: { name: string };
}

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  useEffect(() => {
    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(addDays(weekStart, 6), "yyyy-MM-dd");
    fetch(`/api/sessions?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.filter((s: Session) => s.status === "BOOKED")));
  }, [weekStart]);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then(setAnnouncements);
  }, []);

  // Group sessions by date
  const grouped: Record<string, Session[]> = {};
  for (const s of sessions) {
    const key = format(toGymTime(s.date), "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Upcoming Bookings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bookings
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Week of {format(weekStart, "MMM d")}</span>
              <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings this week</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([dateKey, daySessions]) => (
                <div key={dateKey}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(new Date(dateKey + "T12:00:00"), "EEEE, MMMM d")}
                  </p>
                  <div className="space-y-2">
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {s.client?.name || s.client?.email || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(toGymTime(s.date), "h:mm a")} · {s.duration || 60} min
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {s.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 border-l-2 border-brand pl-3">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  {a.pinned && (
                    <Badge variant="secondary" className="shrink-0 text-xs">Pinned</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
