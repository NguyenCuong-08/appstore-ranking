"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TrackButton({ appId }: { appId: string }) {
  const [loading, setLoading] = useState(false);

  async function track() {
    setLoading(true);
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: appId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to track");
      toast.success("Đã track app này");
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Button onClick={track} disabled={loading}>
      {loading ? "…" : "Lưu vào My Apps"}
    </Button>
  );
}