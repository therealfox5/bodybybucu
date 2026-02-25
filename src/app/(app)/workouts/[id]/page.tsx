"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Check, Search, Trophy, Save, X } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface SetData {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  variant: string | null;
  isPR: boolean;
  exercise: { name: string; muscleGroup: string };
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  sets: SetData[];
}

const PULL_UP_STYLES = ["No Band", "Green Band", "Multi Band", "Grey Band"];

function isTimedExercise(name: string): boolean {
  return name.includes("Mile Time");
}

function isBodyweightExercise(name: string): boolean {
  return name === "Push Ups" || name === "Pull Ups";
}

function isPullUps(name: string): boolean {
  return name === "Pull Ups";
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [setInputs, setSetInputs] = useState({
    reps: "",
    weight: "",
    minutes: "",
    seconds: "",
    style: "No Band",
  });
  const [prAnimation, setPrAnimation] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const fetchWorkout = useCallback(async () => {
    try {
      const res = await fetch(`/api/workouts/${workoutId}`);
      if (res.ok) {
        setWorkout(await res.json());
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Workout fetch failed:", res.status, data);
        setError(data.error || `Workout not found (${res.status})`);
      }
    } catch (e) {
      console.error("Workout fetch exception:", e);
      setError("Failed to load workout");
    }
  }, [workoutId]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  useEffect(() => {
    if (showExercisePicker) {
      fetch(`/api/exercises?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load exercises");
          return r.json();
        })
        .then(setExercises)
        .catch(() => toast.error("Could not load exercises"));
    }
  }, [searchQuery, showExercisePicker]);

  const isTimed = selectedExercise ? isTimedExercise(selectedExercise.name) : false;
  const isBodyweight = selectedExercise ? isBodyweightExercise(selectedExercise.name) : false;
  const isPullUp = selectedExercise ? isPullUps(selectedExercise.name) : false;

  function startEditSet(set: SetData) {
    setEditingSetId(set.id);
    if (!selectedExercise || selectedExercise.id !== set.exerciseId) {
      setSelectedExercise({
        id: set.exerciseId,
        name: set.exercise.name,
        muscleGroup: set.exercise.muscleGroup,
      });
    }
    if (isTimedExercise(set.exercise.name) && set.duration) {
      setSetInputs({
        reps: "",
        weight: "",
        minutes: Math.floor(set.duration / 60).toString(),
        seconds: (set.duration % 60).toString(),
        style: set.variant || "No Band",
      });
    } else {
      setSetInputs({
        reps: set.reps?.toString() || "",
        weight: set.weight?.toString() || "",
        minutes: "",
        seconds: "",
        style: set.variant || "No Band",
      });
    }
  }

  function cancelEdit() {
    setEditingSetId(null);
    setSetInputs({ reps: "", weight: "", minutes: "", seconds: "", style: "No Band" });
  }

  async function saveSet() {
    if (!selectedExercise) return;

    if (editingSetId) {
      const payload: Record<string, unknown> = { setId: editingSetId };
      if (isTimed) {
        const totalSeconds =
          (parseInt(setInputs.minutes) || 0) * 60 +
          (parseInt(setInputs.seconds) || 0);
        payload.duration = totalSeconds || null;
      } else if (isBodyweight) {
        payload.reps = setInputs.reps ? parseInt(setInputs.reps) : null;
        payload.weight = 0;
        if (isPullUp) payload.variant = setInputs.style;
      } else {
        payload.reps = setInputs.reps ? parseInt(setInputs.reps) : null;
        payload.weight = setInputs.weight ? parseFloat(setInputs.weight) : null;
      }

      const res = await fetch(`/api/workouts/${workoutId}/sets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isPR) {
          setPrAnimation(true);
          toast.success("NEW PERSONAL RECORD!", { duration: 4000 });
          setTimeout(() => setPrAnimation(false), 3000);
        } else {
          toast.success("Logged");
        }
        setEditingSetId(null);
        setSetInputs({ reps: "", weight: "", minutes: "", seconds: "", style: "No Band" });
        fetchWorkout();
      } else {
        toast.error("Failed to save");
      }
    } else {
      const existingSets =
        workout?.sets.filter((s) => s.exerciseId === selectedExercise.id) || [];

      const payload: Record<string, unknown> = {
        exerciseId: selectedExercise.id,
        setNumber: existingSets.length + 1,
      };

      if (isTimed) {
        const totalSeconds =
          (parseInt(setInputs.minutes) || 0) * 60 +
          (parseInt(setInputs.seconds) || 0);
        payload.duration = totalSeconds || null;
      } else if (isBodyweight) {
        payload.reps = setInputs.reps ? parseInt(setInputs.reps) : null;
        payload.weight = 0;
        if (isPullUp) payload.variant = setInputs.style;
      } else {
        payload.reps = setInputs.reps ? parseInt(setInputs.reps) : null;
        payload.weight = setInputs.weight ? parseFloat(setInputs.weight) : null;
      }

      const res = await fetch(`/api/workouts/${workoutId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isPR) {
          setPrAnimation(true);
          const desc = isTimed
            ? `${selectedExercise.name}: ${formatDuration(payload.duration as number)}`
            : isBodyweight
              ? `${selectedExercise.name}: ${setInputs.reps} reps`
              : `${selectedExercise.name}: ${setInputs.weight} lbs × ${setInputs.reps}`;
          toast.success("NEW PERSONAL RECORD!", {
            description: desc,
            duration: 4000,
          });
          setTimeout(() => setPrAnimation(false), 3000);
        } else {
          toast.success("Logged");
        }
        setSetInputs({ reps: "", weight: "", minutes: "", seconds: "", style: "No Band" });
        fetchWorkout();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("POST sets failed:", res.status, err);
        toast.error(err.error || `Failed to log: ${res.status}`);
      }
    }
  }

  async function finishWorkout() {
    await fetch(`/api/workouts/${workoutId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    toast.success("Benchmark saved!");
    router.push("/workouts");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.push("/workouts")}>
          Back to Benchmarks
        </Button>
      </div>
    );
  }

  if (!workout) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  // Group sets by exercise
  const exerciseGroups = new Map<string, SetData[]>();
  for (const set of workout.sets) {
    const key = set.exerciseId;
    if (!exerciseGroups.has(key)) exerciseGroups.set(key, []);
    exerciseGroups.get(key)!.push(set);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* PR Animation overlay */}
      {prAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="animate-bounce text-center">
            <Trophy className="mx-auto h-16 w-16 text-brand" />
            <p className="mt-4 text-3xl font-black text-brand">NEW PR!</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {workout.name || "Log Benchmark"}
          </h1>
        </div>
        {!workout.completedAt && (
          <Button
            onClick={finishWorkout}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-1 h-4 w-4" /> Done
          </Button>
        )}
      </div>

      {/* Existing sets grouped by exercise */}
      {Array.from(exerciseGroups.entries()).map(([exId, sets]) => {
        const timed = isTimedExercise(sets[0].exercise.name);
        const bodyweight = isBodyweightExercise(sets[0].exercise.name);
        const pullUp = isPullUps(sets[0].exercise.name);
        return (
          <Card key={exId} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{sets[0].exercise.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {sets[0].exercise.muscleGroup}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
                  <span>Set</span>
                  <span>{timed ? "Time" : bodyweight ? "Reps" : "Weight / Reps"}</span>
                  <span></span>
                </div>
                {sets.map((set) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-3 gap-2 text-sm items-center rounded px-1 ${
                      !workout.completedAt ? "cursor-pointer hover:bg-secondary/50" : ""
                    }`}
                    onClick={() => {
                      if (!workout.completedAt) startEditSet(set);
                    }}
                  >
                    <span>{set.setNumber}</span>
                    <span>
                      {timed && set.duration
                        ? formatDuration(set.duration)
                        : bodyweight
                          ? `${set.reps ?? "—"} reps${pullUp && set.variant ? ` (${set.variant})` : ""}`
                          : `${set.weight ? `${set.weight} lbs` : "—"} × ${set.reps ?? "—"}`}
                    </span>
                    <span>
                      {set.isPR && (
                        <Badge className="bg-brand text-white text-xs">PR</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add exercise / sets */}
      {!workout.completedAt && (
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 pt-6">
            {/* Exercise picker */}
            {!selectedExercise ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowExercisePicker(!showExercisePicker)}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Exercise
                </Button>

                {showExercisePicker && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto rounded-md border border-border">
                      {exercises.map((ex) => (
                        <button
                          key={ex.id}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-secondary"
                          onClick={() => {
                            setSelectedExercise(ex);
                            setShowExercisePicker(false);
                            setSearchQuery("");
                          }}
                        >
                          <span>{ex.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {ex.muscleGroup}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{selectedExercise.name}</p>
                  {!editingSetId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedExercise(null)}
                    >
                      Change
                    </Button>
                  )}
                </div>

                {/* Pull Ups style selector */}
                {isPullUp && (
                  <div className="flex flex-wrap gap-2">
                    {PULL_UP_STYLES.map((style) => (
                      <button
                        key={style}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          setInputs.style === style
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border text-muted-foreground hover:border-brand/50"
                        }`}
                        onClick={() =>
                          setSetInputs((p) => ({ ...p, style }))
                        }
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {isTimed ? (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Minutes
                        </label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="min"
                          value={setInputs.minutes}
                          onChange={(e) =>
                            setSetInputs((p) => ({ ...p, minutes: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Seconds
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="sec"
                          value={setInputs.seconds}
                          onChange={(e) =>
                            setSetInputs((p) => ({ ...p, seconds: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  ) : isBodyweight ? (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Reps
                        </label>
                        <Input
                          type="number"
                          placeholder="reps"
                          value={setInputs.reps}
                          onChange={(e) =>
                            setSetInputs((p) => ({ ...p, reps: e.target.value }))
                          }
                        />
                      </div>
                      <div>{/* spacer */}</div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Weight
                        </label>
                        <Input
                          type="number"
                          step="2.5"
                          placeholder="lbs"
                          value={setInputs.weight}
                          onChange={(e) =>
                            setSetInputs((p) => ({ ...p, weight: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Reps
                        </label>
                        <Input
                          type="number"
                          placeholder="reps"
                          value={setInputs.reps}
                          onChange={(e) =>
                            setSetInputs((p) => ({ ...p, reps: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-end gap-1">
                    <Button onClick={saveSet} className="flex-1">
                      {editingSetId ? (
                        <Save className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                    {editingSetId && (
                      <Button variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
