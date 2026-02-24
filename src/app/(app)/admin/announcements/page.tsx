"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Pin } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: { name: string };
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch("/api/announcements");
    if (res.ok) setAnnouncements(await res.json());
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, pinned }),
    });
    if (res.ok) {
      toast.success("Announcement created");
      setTitle("");
      setBody("");
      setPinned(false);
      setShowForm(false);
      fetchAnnouncements();
    } else {
      toast.error("Failed to create announcement");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/announcements?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Announcement deleted");
      fetchAnnouncements();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {showForm && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Textarea
                placeholder="Announcement body..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={3}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="accent-brand"
                />
                <Pin className="h-3 w-3" /> Pin to dashboard
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  Publish
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id} className="border-border bg-card">
            <CardContent className="flex items-start justify-between py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.title}</p>
                  {a.pinned && (
                    <Badge variant="secondary" className="text-xs">
                      <Pin className="mr-1 h-3 w-3" /> Pinned
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  — {a.author.name} •{" "}
                  {format(new Date(a.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(a.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
