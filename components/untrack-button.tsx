"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UntrackButton({ appId }: { appId: string }) {
  const [loading, setLoading] = useState(false);

  async function untrack() {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to untrack");
      }
      toast.success("Đã bỏ track app");
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={untrack} disabled={loading}>
      {loading ? "…" : "Un-track"}
    </Button>
  );
}
