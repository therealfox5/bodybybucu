"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { WeightChart } from "@/app/(app)/track/weight-chart";

interface ClientData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  weightEntries: {
    id: string;
    weight: number;
    date: string;
  }[];
  prs: {
    id: string;
    weight: number;
    reps: number;
    estimated1RM: number | null;
    date: string;
    exercise: { name: string };
  }[];
  sessions: {
    id: string;
    date: string;
    status: string;
    type: string;
    trainer: { name: string };
  }[];
  workouts: {
    id: string;
    name: string;
    startedAt: string;
    completedAt: string | null;
    sets: { exercise: { name: string } }[];
  }[];
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [data, setData] = useState<ClientData | null>(null);

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}`)
      .then((r) => r.json())
      .then(setData);
  }, [clientId]);

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  const { user, weightEntries, prs, sessions, workouts } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{user.name || "Client"}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {user.phone && (
          <p className="text-sm text-muted-foreground">{user.phone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Member since {format(new Date(user.createdAt), "MMM d, yyyy")}
        </p>
      </div>

      {/* Weight Chart */}
      {weightEntries.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={weightEntries} />
          </CardContent>
        </Card>
      )}

      {/* PRs */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Personal Records ({prs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {prs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PRs yet</p>
          ) : (
            <div className="space-y-2">
              {prs.slice(0, 10).map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between border-b border-border py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{pr.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.weight} lbs × {pr.reps}
                      {pr.estimated1RM && ` • Est. 1RM: ${pr.estimated1RM}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(pr.date), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Training Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-border py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(s.date), "EEE, MMM d • h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.trainer.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      s.status === "COMPLETED"
                        ? "default"
                        : s.status === "CANCELLED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workouts */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workouts</p>
          ) : (
            <div className="space-y-2">
              {workouts.map((w) => {
                const exerciseNames = [
                  ...new Set(w.sets.map((s) => s.exercise.name)),
                ];
                return (
                  <div
                    key={w.id}
                    className="border-b border-border py-2 last:border-0"
                  >
                    <p className="text-sm font-medium">
                      {w.name ||
                        format(new Date(w.startedAt), "EEEE Workout")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(w.startedAt), "MMM d, yyyy")} •{" "}
                      {w.sets.length} sets
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exerciseNames.slice(0, 4).join(", ")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
