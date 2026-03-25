import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, subDays } from "date-fns";

function toGymTime(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes());
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role === "CLIENT") redirect("/dashboard");

  const now = new Date();

  const [upcomingSessions, announcements] = await Promise.all([
    db.trainingSession.findMany({
      where: {
        date: { gte: startOfDay(subDays(now, 1)) },
        status: "BOOKED",
      },
      orderBy: { date: "asc" },
      take: 20,
      include: {
        client: { select: { name: true, email: true } },
      },
    }),
    db.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { author: { select: { name: true } } },
    }),
  ]);

  // Group sessions by date label
  const grouped: Record<string, typeof upcomingSessions> = {};
  for (const s of upcomingSessions) {
    const key = format(toGymTime(s.date), "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Upcoming Bookings grouped by day */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Upcoming Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming bookings</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([dateKey, sessions]) => (
                <div key={dateKey}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(new Date(dateKey + "T12:00:00"), "EEEE, MMMM d")}
                  </p>
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {s.client.name || s.client.email}
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
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Pinned
                    </Badge>
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
