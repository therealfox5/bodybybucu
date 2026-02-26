"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";

/** Server (UTC) stores Eastern times as UTC values — extract UTC components for correct display */
function toGymTime(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

interface Session {
  id: string;
  date: string;
  status: string;
  type: string;
  duration: number;
  client: { name: string; email: string };
  trainer: { name: string };
}

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AdminSchedulePage() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newDay, setNewDay] = useState("0");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [newSlot, setNewSlot] = useState("60");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("");
  const [editDuration, setEditDuration] = useState("");

  const fetchData = useCallback(async () => {
    const weekStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

    const [avRes, sesRes] = await Promise.all([
      fetch("/api/availability"),
      fetch(`/api/sessions?start=${weekStr}&end=${endStr}`),
    ]);
    if (avRes.ok) setAvailability(await avRes.json());
    if (sesRes.ok) setSessions(await sesRes.json());
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addAvailability(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: parseInt(newDay),
        startTime: newStart,
        endTime: newEnd,
        slotMinutes: parseInt(newSlot),
      }),
    });
    if (res.ok) {
      toast.success("Availability added");
      setShowAdd(false);
      fetchData();
    }
  }

  async function removeAvailability(id: string) {
    await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
    toast.success("Availability removed");
    fetchData();
  }

  async function updateSessionStatus(id: string, status: string) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Session marked as ${status.toLowerCase()}`);
      fetchData();
    }
  }

  function startEditing(s: Session) {
    const d = toGymTime(s.date);
    setEditingId(s.id);
    setEditDate(format(d, "yyyy-MM-dd"));
    setEditTime(format(d, "HH:mm"));
    setEditType(s.type);
    setEditDuration(String(s.duration || 60));
  }

  async function saveEdit(id: string) {
    const dateTime = new Date(`${editDate}T${editTime}:00`);
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateTime.toISOString(),
        type: editType,
        duration: parseInt(editDuration),
      }),
    });
    if (res.ok) {
      toast.success("Session updated");
      setEditingId(null);
      fetchData();
    } else {
      toast.error("Failed to update session");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule Management</h1>

      {/* Availability */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trainer Availability</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAdd && (
            <form
              onSubmit={addAvailability}
              className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 md:grid-cols-5"
            >
              <div>
                <Label className="text-xs">Day</Label>
                <Select value={newDay} onValueChange={setNewDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayNames.map((name, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Slot (min)</Label>
                <Input
                  type="number"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Save
                </Button>
              </div>
            </form>
          )}
          {availability.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No availability set
            </p>
          ) : (
            <div className="space-y-2">
              {availability.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="text-sm">
                    <span className="font-medium">
                      {dayNames[a.dayOfWeek]}
                    </span>{" "}
                    • {a.startTime} — {a.endTime} • {a.slotMinutes}min slots
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAvailability(a.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings this week */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bookings</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Week of {format(weekStart, "MMM d")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings this week
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border p-3"
                >
                  {editingId === s.id ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">
                        {s.client.name || s.client.email}
                      </p>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <div>
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Time</Label>
                          <Input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={editType} onValueChange={setEditType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERSONAL">Personal</SelectItem>
                              <SelectItem value="GROUP">Group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Select value={editDuration} onValueChange={setEditDuration}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="45">45 min</SelectItem>
                              <SelectItem value="60">60 min</SelectItem>
                              <SelectItem value="90">90 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(s.id)}>
                          <Check className="mr-1 h-3 w-3" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {s.client.name || s.client.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(toGymTime(s.date), "EEE, MMM d • h:mm a")} •{" "}
                          {s.type} • {s.duration || 60}min
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            s.status === "COMPLETED"
                              ? "default"
                              : s.status === "CANCELLED"
                              ? "destructive"
                              : s.status === "NO_SHOW"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {s.status}
                        </Badge>
                        {s.status === "BOOKED" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => startEditing(s)}
                            >
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-green-500"
                              onClick={() =>
                                updateSessionStatus(s.id, "COMPLETED")
                              }
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-yellow-500"
                              onClick={() =>
                                updateSessionStatus(s.id, "NO_SHOW")
                              }
                            >
                              No-Show
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
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
