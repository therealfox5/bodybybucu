"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  addWeeks,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

/** Server (UTC) stores Eastern times as UTC values — extract UTC components for correct display */
function toGymTime(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
}

function ChangeDeadlineTimer({ sessionDate }: { sessionDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const deadline = toGymTime(sessionDate).getTime() - 6 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sessionDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{timeLeft} left to make changes</span>
    </div>
  );
}

interface Slot {
  trainerId: string;
  date: string;
  time: string;
  available: boolean;
}

interface Session {
  id: string;
  date: string;
  status: string;
  type: string;
  trainer: { name: string };
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [booking, setBooking] = useState(false);

  const fetchData = useCallback(async () => {
    const weekStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

    const [slotsRes, sessionsRes] = await Promise.all([
      fetch(`/api/slots?week=${weekStr}`),
      fetch(`/api/sessions?start=${weekStr}&end=${endStr}`),
    ]);

    if (slotsRes.ok) setSlots(await slotsRes.json());
    if (sessionsRes.ok) setSessions(await sessionsRes.json());
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function bookSlot(slot: Slot) {
    setBooking(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerId: slot.trainerId,
        date: slot.date,
        type: "PERSONAL",
      }),
    });

    if (res.ok) {
      toast.success("Session booked!");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to book session");
    }
    setBooking(false);
  }

  async function cancelSession(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });

    if (res.ok) {
      toast.success("Session cancelled");
      fetchData();
    } else {
      toast.error("Failed to cancel");
    }
  }

  // Group slots by day (Mon-Sat only)
  const slotsByDay: Slot[][] = Array.from({ length: 6 }, () => []);
  for (const slot of slots) {
    const slotDate = new Date(slot.date);
    const dayIndex = (slotDate.getDay() + 6) % 7; // Mon=0
    if (dayIndex < 6) slotsByDay[dayIndex].push(slot);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule</h1>

      {/* My Upcoming Sessions (hide past) */}
      {sessions.filter((s) => s.status === "BOOKED" && toGymTime(s.date).getTime() > Date.now()).length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Booked Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions
              .filter((s) => s.status === "BOOKED" && toGymTime(s.date).getTime() > Date.now())
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(toGymTime(s.date), "EEEE, MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(toGymTime(s.date), "h:mm a")}
                    </p>
                    <ChangeDeadlineTimer sessionDate={s.date} />
                  </div>
                  <div className="flex items-center gap-2">
                    {toGymTime(s.date).getTime() - Date.now() > 6 * 60 * 60 * 1000 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={() => cancelSession(s.id)}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <a href="sms:9082658044">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Text Trainer
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((w) => addWeeks(w, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">
          Week of {format(weekStart, "MMM d, yyyy")}
        </p>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {dayLabels.map((day, i) => (
          <Card key={day} className="border-border bg-card">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-center text-xs font-medium">
                <span className="block text-muted-foreground">{day}</span>
                <span className="text-lg">
                  {format(addDays(weekStart, i), "d")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {slotsByDay[i].length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  —
                </p>
              ) : (
                slotsByDay[i].map((slot, j) => (
                  <Button
                    key={j}
                    variant={slot.available ? "outline" : "ghost"}
                    size="sm"
                    className={`w-full text-xs ${
                      !slot.available
                        ? "cursor-not-allowed opacity-40 line-through"
                        : ""
                    }`}
                    disabled={!slot.available || booking}
                    onClick={() => slot.available && bookSlot(slot)}
                  >
                    {slot.time}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
