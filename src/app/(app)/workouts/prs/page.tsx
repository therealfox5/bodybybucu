"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trophy } from "lucide-react";

interface PR {
  id: string;
  weight: number;
  reps: number;
  estimated1RM: number | null;
  date: string;
  exercise: { name: string; muscleGroup: string };
}

function isTimedExercise(name: string): boolean {
  return name.includes("Mile Time");
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
  return `${pr.weight} lbs × ${pr.reps}`;
}

function formatEstimated1RM(pr: PR): string | null {
  if (!pr.estimated1RM) return null;
  if (isTimedExercise(pr.exercise.name)) return null;
  return `Est. 1RM: ${pr.estimated1RM} lbs`;
}

export default function PRsPage() {
  const [best, setBest] = useState<PR[]>([]);
  const [all, setAll] = useState<PR[]>([]);

  useEffect(() => {
    fetch("/api/prs")
      .then((r) => r.json())
      .then((data) => {
        setBest(data.best || []);
        setAll(data.all || []);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-brand" />
        <h1 className="text-2xl font-bold">Personal Records</h1>
      </div>

      {best.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              No PRs yet — start crushing sets!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {best.map((pr) => (
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

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>PR History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {all.slice(0, 30).map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between border-b border-border py-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {pr.exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPRValue(pr)}
                        {formatEstimated1RM(pr) && ` • ${formatEstimated1RM(pr)}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(pr.date), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
