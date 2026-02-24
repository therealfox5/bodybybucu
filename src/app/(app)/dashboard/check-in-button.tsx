"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

export function CheckInButton({ alreadyCheckedIn }: { alreadyCheckedIn: boolean }) {
  const [checkedIn, setCheckedIn] = useState(alreadyCheckedIn);
  const [loading, setLoading] = useState(false);

  async function handleCheckIn() {
    if (checkedIn) return;
    setLoading(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch("/api/checkins", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          });

          if (res.ok) {
            setCheckedIn(true);
            toast.success("Checked in!");
          } else {
            const data = await res.json();
            toast.error(data.error || "Check-in failed");
          }
        } catch {
          toast.error("Check-in failed");
        }
        setLoading(false);
      },
      () => {
        toast.error("Unable to get your location");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <Button
      onClick={handleCheckIn}
      disabled={checkedIn || loading}
      className={checkedIn ? "bg-green-600 hover:bg-green-600 text-white" : ""}
    >
      <MapPin className="mr-2 h-4 w-4" />
      {loading ? "Locating..." : checkedIn ? "Checked In" : "Check In"}
    </Button>
  );
}
