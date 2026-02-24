"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search } from "lucide-react";

interface Client {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: {
    bookedSessions: number;
    workouts: number;
    personalRecords: number;
  };
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  const fetchClients = useCallback(async () => {
    const res = await fetch(
      `/api/admin/clients?q=${encodeURIComponent(search)}`
    );
    if (res.ok) setClients(await res.json());
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchClients, 300);
    return () => clearTimeout(debounce);
  }, [fetchClients]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {clients.map((client) => (
          <Link key={client.id} href={`/admin/clients/${client.id}`}>
            <Card className="border-border bg-card transition-colors hover:bg-secondary/50">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{client.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">
                    {client.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(client.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {client._count.bookedSessions} sessions
                  </Badge>
                  <Badge variant="secondary">
                    {client._count.workouts} workouts
                  </Badge>
                  <Badge variant="secondary">
                    {client._count.personalRecords} PRs
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {clients.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No clients found
          </p>
        )}
      </div>
    </div>
  );
}
