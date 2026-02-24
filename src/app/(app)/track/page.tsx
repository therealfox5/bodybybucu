"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { WeightChart } from "./weight-chart";
import { MeasurementChart } from "./measurement-chart";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  notes?: string;
}

interface MeasurementEntry {
  id: string;
  date: string;
  neck?: number;
  shoulders?: number;
  chest?: number;
  leftArm?: number;
  rightArm?: number;
  waist?: number;
  hips?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  notes?: string;
}

const measurementFields = [
  { key: "neck", label: "Neck" },
  { key: "chest", label: "Chest" },
  { key: "leftArm", label: "Arms" },
  { key: "waist", label: "Waist" },
  { key: "leftThigh", label: "Thigh" },
] as const;

export default function TrackPage() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [measurementEntries, setMeasurementEntries] = useState<
    MeasurementEntry[]
  >([]);
  const [weight, setWeight] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit state for weight entries
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editWeightNotes, setEditWeightNotes] = useState("");

  // Edit state for measurement entries
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [editMeasurements, setEditMeasurements] = useState<Record<string, string>>({});
  const [editMeasurementNotes, setEditMeasurementNotes] = useState("");

  const fetchData = useCallback(async () => {
    const [wRes, mRes] = await Promise.all([
      fetch("/api/weight"),
      fetch("/api/measurements"),
    ]);
    if (wRes.ok) setWeightEntries(await wRes.json());
    if (mRes.ok) setMeasurementEntries(await mRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight: parseFloat(weight),
        notes: weightNotes || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Weight logged!");
      setWeight("");
      setWeightNotes("");
      fetchData();
    } else {
      toast.error("Failed to log weight");
    }
    setLoading(false);
  }

  function startEditWeight(entry: WeightEntry) {
    setEditingWeightId(entry.id);
    setEditWeight(entry.weight.toString());
    setEditWeightNotes(entry.notes || "");
  }

  async function saveEditWeight() {
    if (!editingWeightId) return;
    const res = await fetch("/api/weight", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingWeightId,
        weight: parseFloat(editWeight),
        notes: editWeightNotes || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Weight updated");
      setEditingWeightId(null);
      fetchData();
    } else {
      toast.error("Failed to update");
    }
  }

  async function deleteWeight(id: string) {
    const res = await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Entry deleted");
      fetchData();
    } else {
      toast.error("Failed to delete");
    }
  }

  async function handleLogMeasurements(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const data: Record<string, number | string | undefined> = {};
    for (const field of measurementFields) {
      const val = measurements[field.key];
      if (val) data[field.key] = parseFloat(val);
    }
    if (measurementNotes) data.notes = measurementNotes;

    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success("Measurements logged!");
      setMeasurements({});
      setMeasurementNotes("");
      fetchData();
    } else {
      toast.error("Failed to log measurements");
    }
    setLoading(false);
  }

  function startEditMeasurement(entry: MeasurementEntry) {
    setEditingMeasurementId(entry.id);
    const vals: Record<string, string> = {};
    for (const field of measurementFields) {
      const v = entry[field.key as keyof MeasurementEntry];
      if (v != null) vals[field.key] = v.toString();
    }
    setEditMeasurements(vals);
    setEditMeasurementNotes(entry.notes || "");
  }

  async function saveEditMeasurement() {
    if (!editingMeasurementId) return;
    const data: Record<string, number | string | undefined> = { id: editingMeasurementId };
    for (const field of measurementFields) {
      const val = editMeasurements[field.key];
      if (val) data[field.key] = parseFloat(val);
    }
    if (editMeasurementNotes) data.notes = editMeasurementNotes;

    const res = await fetch("/api/measurements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success("Measurements updated");
      setEditingMeasurementId(null);
      fetchData();
    } else {
      toast.error("Failed to update");
    }
  }

  async function deleteMeasurement(id: string) {
    const res = await fetch(`/api/measurements?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Entry deleted");
      fetchData();
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Body Tracking</h1>

      <Tabs defaultValue="weight">
        <TabsList className="bg-secondary">
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
        </TabsList>

        <TabsContent value="weight" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Log Weight</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogWeight} className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Weight (lbs)"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Notes (optional)"
                    value={weightNotes}
                    onChange={(e) => setWeightNotes(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  Log
                </Button>
              </form>
            </CardContent>
          </Card>

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

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weightEntries.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border-b border-border py-2 last:border-0"
                  >
                    {editingWeightId === entry.id ? (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            className="h-8 w-24"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                          />
                          <Input
                            className="h-8 w-32"
                            placeholder="Notes"
                            value={editWeightNotes}
                            onChange={(e) => setEditWeightNotes(e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500"
                            onClick={saveEditWeight}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingWeightId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(entry.date), "MMM d, yyyy")}
                          </span>
                          {entry.notes && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              — {entry.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.weight} lbs</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditWeight(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteWeight(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Log Measurements (inches)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogMeasurements} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {measurementFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="—"
                        value={measurements[field.key] || ""}
                        onChange={(e) =>
                          setMeasurements((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={measurementNotes}
                  onChange={(e) => setMeasurementNotes(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                  Log Measurements
                </Button>
              </form>
            </CardContent>
          </Card>

          {measurementEntries.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Measurement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <MeasurementChart data={measurementEntries} />
              </CardContent>
            </Card>
          )}

          {/* Measurement History */}
          {measurementEntries.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {measurementEntries.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border p-3"
                  >
                    {editingMeasurementId === entry.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {format(new Date(entry.date), "MMM d, yyyy")}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500"
                              onClick={saveEditMeasurement}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingMeasurementId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                          {measurementFields.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-xs">{field.label}</Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="—"
                                className="h-8"
                                value={editMeasurements[field.key] || ""}
                                onChange={(e) =>
                                  setEditMeasurements((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <Input
                          placeholder="Notes (optional)"
                          className="h-8"
                          value={editMeasurementNotes}
                          onChange={(e) => setEditMeasurementNotes(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {format(new Date(entry.date), "MMM d, yyyy")}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditMeasurement(entry)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMeasurement(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
                          {measurementFields.map((field) => {
                            const val = entry[field.key as keyof MeasurementEntry];
                            if (val == null) return null;
                            return (
                              <div key={field.key} className="flex justify-between">
                                <span className="text-muted-foreground">{field.label}</span>
                                <span className="font-medium">{val}&quot;</span>
                              </div>
                            );
                          })}
                        </div>
                        {entry.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
