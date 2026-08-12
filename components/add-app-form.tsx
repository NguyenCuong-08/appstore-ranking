"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddAppForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add app");
      toast.success(`Đã thêm ${data.app.name} vào My Apps`);
      router.push("/my-apps");
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Label htmlFor="link">App Store link hoặc App ID</Label>
      <Input
        id="link"
        placeholder="https://apps.apple.com/app/id6782706682 hoặc 6782706682"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Adding…" : "Track this app"}
      </Button>
    </form>
  );
}
