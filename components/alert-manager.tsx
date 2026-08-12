"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, CHARTS, CHART_LABELS } from "@/lib/constants";
import type { ChartType, RankAlert } from "@/lib/types";

export function AlertManager({ appId }: { appId: string }) {
  const [alerts, setAlerts] = useState<RankAlert[]>([]);
  const [country, setCountry] = useState("us");
  const [chart, setChart] = useState<ChartType>("top-free");
  const [threshold, setThreshold] = useState("10");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/alerts?appId=${appId}`);
    const data = await res.json();
    if (res.ok) setAlerts(data.data ?? []);
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    const t = Number(threshold);
    if (!Number.isInteger(t) || t < 1) {
      toast.error("Threshold phải là số nguyên >= 1");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, country_code: country, chart_type: chart, threshold_rank: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Đã tạo alert");
      setAlerts((prev) => [data.data, ...prev]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Đã xoá alert");
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-semibold">Rank Alerts</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Nhận thông báo khi rank đạt điều kiện (hiện tại chỉ log trong cron).
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Country</span>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Chart</span>
          <Select value={chart} onValueChange={(v) => setChart(v as ChartType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHARTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CHART_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Threshold ≤</span>
          <Input
            className="w-24"
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </label>
        <Button onClick={create} disabled={loading}>
          {loading ? "…" : "Tạo alert"}
        </Button>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có alert nào.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              <Badge variant="secondary" className="uppercase">
                {a.country_code}
              </Badge>
              <Badge variant="outline">{CHART_LABELS[a.chart_type]}</Badge>
              <span className="text-muted-foreground">rank ≤ {a.threshold_rank}</span>
              <Badge variant={a.active ? "default" : "outline"}>
                {a.active ? "active" : "paused"}
              </Badge>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await fetch(`/api/alerts/${a.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ active: !a.active }),
                    });
                    if (res.ok) load();
                  }}
                >
                  {a.active ? "Pause" : "Resume"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
