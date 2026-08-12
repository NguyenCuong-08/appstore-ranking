"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHARTS, CHART_LABELS } from "@/lib/constants";
import type { ChartType } from "@/lib/types";

interface HistoryRow {
  captured_at: string;
  rank: number | null;
  country_code: string;
  chart_type: ChartType;
}

const LINE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#d97706",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

export function RankHistoryChart({
  appId,
  pinnedCountries,
}: {
  appId: string;
  pinnedCountries: string[];
}) {
  const [chartType, setChartType] = useState<ChartType>("top-free");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/apps/${appId}/rank-history?days=30`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  const countries = useMemo(() => {
    const filter =
      pinnedCountries.length > 0
        ? new Set(pinnedCountries)
        : new Set(rows.map((r) => r.country_code));
    return [...filter];
  }, [rows, pinnedCountries]);

  const data = useMemo(() => {
    const filtered = rows.filter((r) => r.chart_type === chartType);
    const byDate = new Map<string, Record<string, unknown>>();
    for (const r of filtered) {
      if (r.rank === null || r.rank === undefined) continue;
      const date = r.captured_at.slice(0, 10);
      const bucket = byDate.get(date) ?? { date };
      if (pinnedCountries.length === 0 || countries.includes(r.country_code)) {
        bucket[r.country_code] = r.rank;
      }
      byDate.set(date, bucket);
    }
    return [...byDate.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [rows, chartType, countries, pinnedCountries.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <SelectTrigger className="w-44">
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
        <span className="text-xs text-muted-foreground">30 ngày · rank 1 ở trên cùng</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && !error && data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Chưa có dữ liệu lịch sử. Cron sync sẽ lấy rank định kỳ.
        </p>
      )}
      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis reversed domain={[1, 200]} tick={{ fontSize: 12 }} allowDataOverflow />
            <Tooltip />
            <Legend />
            {countries.map((code, i) => (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                name={code.toUpperCase()}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
