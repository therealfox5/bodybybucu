import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { WeightMiniChart } from "./weight-mini-chart";
import { CheckInButton } from "./check-in-button";

function formatPRDisplay(pr: { weight: number; reps: number; exercise: { name: string } }): string {
  if (pr.exercise.name.includes("Mile Time")) {
    const m = Math.floor(pr.weight / 60);
    const s = pr.weight % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  if (pr.exercise.name === "Push Ups" || pr.exercise.name === "Pull Ups") {
    return `${pr.reps} reps`;
  }
  return `${pr.weight} lbs × ${pr.reps}`;
}

const sessionTypeLabels: Record<string, string> = {
  PERSONAL: "Training",
  GROUP: "Group",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const now = new Date();

  const [upcomingSessions, recentPRs, weightEntries, announcements, recentCheckIns, todayCheckIn] =
    await Promise.all([
      db.trainingSession.findMany({
        where: {
          clientId: userId,
          date: { gte: now },
          status: "BOOKED",
        },
        orderBy: { date: "asc" },
        take: 3,
        include: { trainer: { select: { name: true } } },
      }),
      db.personalRecord.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { exercise: { select: { name: true } } },
      }),
      db.weightEntry.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.announcement.findMany({
        where: { pinned: true },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { author: { select: { name: true } } },
      }),
      db.checkIn.findMany({
        orderBy: { date: "desc" },
        take: 10,
        include: { user: { select: { name: true, image: true } } },
      }),
      db.checkIn.findFirst({
        where: {
          userId,
          date: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {session.user.name?.split(" ")[0] || "Athlete"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s your training overview
          </p>
        </div>
        <CheckInButton alreadyCheckedIn={!!todayCheckIn} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Sessions */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming sessions
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(s.date), "EEE, MMM d")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.date), "h:mm a")} •{" "}
                        {s.trainer.name}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {sessionTypeLabels[s.type] || s.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent PRs */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent PRs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPRs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No PRs yet — start lifting!
              </p>
            ) : (
              <div className="space-y-3">
                {recentPRs.map((pr) => (
                  <div key={pr.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {pr.exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPRDisplay(pr)}
                      </p>
                    </div>
                    <Badge className="bg-brand text-white text-xs">PR</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight Trend */}
        <Card className="border-border bg-card md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weight Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weightEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No weight entries yet
              </p>
            ) : (
              <WeightMiniChart
                data={weightEntries
                  .map((w) => ({
                    date: format(new Date(w.date), "M/d"),
                    weight: w.weight,
                  }))
                  .reverse()}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Check-Ins */}
      {recentCheckIns.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Check-Ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCheckIns.map((ci) => (
                <div key={ci.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{ci.user.name || "Member"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ci.date), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className="border-l-2 border-brand pl-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  — {a.author.name} •{" "}
                  {format(new Date(a.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
