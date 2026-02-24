"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Dumbbell, UserPlus, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalClients: number;
  newClientsThisMonth: number;
  sessionsThisWeek: number;
  totalWorkouts: number;
  checkInsToday: number;
}

interface CheckIn {
  id: string;
  date: string;
  user: { name: string | null; image: string | null };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
    fetch("/api/checkins")
      .then((r) => r.json())
      .then((data: CheckIn[]) => setCheckIns(data.slice(0, 10)));
  }, []);

  const cards = [
    {
      label: "Total Clients",
      value: stats?.totalClients ?? "—",
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "New This Month",
      value: stats?.newClientsThisMonth ?? "—",
      icon: UserPlus,
      color: "text-green-400",
    },
    {
      label: "Sessions This Week",
      value: stats?.sessionsThisWeek ?? "—",
      icon: Calendar,
      color: "text-brand",
    },
    {
      label: "Completed Workouts",
      value: stats?.totalWorkouts ?? "—",
      icon: Dumbbell,
      color: "text-purple-400",
    },
    {
      label: "Check-Ins Today",
      value: stats?.checkInsToday ?? "—",
      icon: MapPin,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Check-Ins Ticker */}
      {checkIns.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Check-Ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkIns.map((ci) => (
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
    </div>
  );
}
