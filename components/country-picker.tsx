"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/constants";

export function CountryPicker({
  appId,
  initialPinned,
}: {
  appId: string;
  initialPinned: string[];
}) {
  const [pinned, setPinned] = useState<string[]>(initialPinned);
  const [saving, setSaving] = useState(false);

  function toggle(code: string) {
    setPinned((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned_countries: pinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Đã lưu nước theo dõi");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-2 text-lg font-semibold">Pin quốc gia theo dõi</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Cron chỉ fetch rank cho các nước được pin để tiết kiệm quota Apple.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {COUNTRIES.map((c) => (
          <Badge
            key={c.code}
            variant={pinned.includes(c.code) ? "default" : "outline"}
            className="cursor-pointer uppercase"
            onClick={() => toggle(c.code)}
            title={c.name}
          >
            {c.code}
          </Badge>
        ))}
      </div>
      <Button className="mt-3" size="sm" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </section>
  );
}
