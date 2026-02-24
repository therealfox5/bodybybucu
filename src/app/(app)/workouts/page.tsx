"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Trophy } from "lucide-react";
import Link from "next/link";

interface PR {
  id: string;
  weight: number;
  reps: number;
  estimated1RM: number | null;
  date: string;
  exercise: { name: string; muscleGroup: string };
}

interface SetData {
  exercise: { name: string; muscleGroup: string };
  reps: number | null;
  weight: number | null;
  duration: number | null;
  variant: string | null;
  isPR: boolean;
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  sets: SetData[];
}

function isTimedExercise(name: string): boolean {
  return name.includes("Mile Time");
}

function isBodyweightExercise(name: string): boolean {
  return name === "Push Ups" || name === "Pull Ups";
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPRValue(pr: PR): string {
  if (isTimedExercise(pr.exercise.name)) {
    return formatDuration(pr.weight);
  }
  if (isBodyweightExercise(pr.exercise.name)) {
    return `${pr.reps} reps`;
  }
  return `${pr.weight} lbs × ${pr.reps}`;
}

function formatEstimated1RM(pr: PR): string | null {
  if (!pr.estimated1RM) return null;
  if (isTimedExercise(pr.exercise.name)) return null;
  if (isBodyweightExercise(pr.exercise.name)) return null;
  return `Est. 1RM: ${pr.estimated1RM} lbs`;
}

function formatSetValue(set: SetData): string {
  if (isTimedExercise(set.exercise.name) && set.duration) {
    return formatDuration(set.duration);
  }
  if (isBodyweightExercise(set.exercise.name)) {
    const base = `${set.reps ?? "—"} reps`;
    return set.variant ? `${base} (${set.variant})` : base;
  }
  return `${set.weight ? `${set.weight} lbs` : "—"} × ${set.reps ?? "—"}`;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [bestPRs, setBestPRs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const [wRes, prRes] = await Promise.all([
      fetch("/api/workouts"),
      fetch("/api/prs"),
    ]);
    if (wRes.ok) setWorkouts(await wRes.json());
    if (prRes.ok) {
      const data = await prRes.json();
      setBestPRs(data.best || []);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function startWorkout() {
    setLoading(true);
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    if (res.ok) {
      const workout = await res.json();
      router.push(`/workouts/${workout.id}`);
    }
    setLoading(false);
  }

  // Flatten workouts into recent benchmark entries
  const recentEntries = workouts.flatMap((w) =>
    w.sets.map((set) => ({
      workoutId: w.id,
      date: w.startedAt,
      exercise: set.exercise,
      value: formatSetValue(set),
      isPR: set.isPR,
    }))
  ).slice(0, 30);

  const hasData = bestPRs.length > 0 || recentEntries.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Benchmarks</h1>
        <Button onClick={startWorkout} disabled={loading} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Log Benchmark
        </Button>
      </div>

      {!hasData ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No benchmarks yet</p>
            <Button className="mt-4" onClick={startWorkout} disabled={loading}>
              <Plus className="mr-1 h-4 w-4" />
              Log Benchmark
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Best PRs */}
          {bestPRs.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold">Personal Records</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {bestPRs.map((pr) => (
                  <Card key={pr.id} className="border-border bg-card">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{pr.exercise.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pr.exercise.muscleGroup}
                        </p>
                        <p className="mt-1 text-lg font-bold text-brand">
                          {formatPRValue(pr)}
                        </p>
                        {formatEstimated1RM(pr) && (
                          <p className="text-xs text-muted-foreground">
                            {formatEstimated1RM(pr)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className="bg-brand text-white">Best</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(pr.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recent History */}
          {recentEntries.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Recent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentEntries.map((entry, i) => (
                    <Link
                      key={`${entry.workoutId}-${i}`}
                      href={`/workouts/${entry.workoutId}`}
                    >
                      <div className="flex items-center justify-between border-b border-border py-2 last:border-0 hover:bg-secondary/50 rounded px-1 -mx-1">
                        <div>
                          <p className="text-sm font-medium">
                            {entry.exercise.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.value}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.isPR && (
                            <Badge className="bg-brand text-white text-xs">
                              PR
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.date), "MMM d")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
