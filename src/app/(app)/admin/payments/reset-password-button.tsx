"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Resets a client's password. Blank = back to their default (phone number / 0000000000). */
export function ResetPasswordButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);

  async function reset(custom?: string) {
    setBusy(true);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: custom }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast.success(`Password set to ${data.password}`);
    else toast.error(data.error || "Reset failed");
  }

  return (
    <span className="ml-2 inline-flex gap-1">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => reset()}>
        Reset to default
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const pw = window.prompt(`New password for ${email} (min 6 characters):`);
          if (pw) reset(pw);
        }}
      >
        Set password
      </Button>
    </span>
  );
}
