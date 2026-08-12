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
import { CountryFlag } from "@/components/country-flag";

interface HistoryRow {
  captured_at: string;
  rank: number | null;
  country_code: string;
  chart_type: ChartType;
}

const LINE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#84cc16",
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <SelectTrigger
            style={{
              background: "oklch(0.20 0.012 250)",
              border: "1px solid oklch(1 0 0 / 8%)",
              borderRadius: "0.5rem",
              color: "oklch(0.96 0 0)",
              width: "160px",
              fontSize: "0.875rem",
            }}
          >
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
        <span style={{ fontSize: "0.8125rem", color: "oklch(0.44 0.01 250)" }}>
          Last 30 days · Rank #1 at top
        </span>
      </div>

      {/* States */}
      {error && (
        <p style={{ fontSize: "0.875rem", color: "#ef4444", margin: 0 }}>{error}</p>
      )}
      {loading && (
        <div
          style={{
            height: "280px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "oklch(0.44 0.01 250)",
            fontSize: "0.875rem",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "1rem",
              height: "1rem",
              borderRadius: "50%",
              border: "2px solid oklch(1 0 0 / 10%)",
              borderTopColor: "var(--blue)",
              animation: "spin2 0.7s linear infinite",
            }}
          />
          Loading history…
        </div>
      )}
      {!loading && !error && data.length === 0 && (
        <div
          style={{
            height: "180px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "oklch(0.50 0.01 250)",
            fontSize: "0.875rem",
            gap: "0.5rem",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={0.3}
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          No ranking history yet. Cron sync will populate data over time.
        </div>
      )}
      {!loading && !error && data.length > 0 && (
        <div style={{ position: "relative" }}>
          <style>{`@keyframes spin2 { to { transform: rotate(360deg); } }`}</style>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "oklch(0.44 0.01 250)" }}
                axisLine={{ stroke: "oklch(1 0 0 / 8%)" }}
                tickLine={false}
              />
              <YAxis
                reversed
                domain={[1, 200]}
                tick={{ fontSize: 11, fill: "oklch(0.44 0.01 250)" }}
                axisLine={{ stroke: "oklch(1 0 0 / 8%)" }}
                tickLine={false}
                allowDataOverflow
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.20 0.012 250)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: "0.625rem",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  fontSize: "0.8125rem",
                  color: "oklch(0.90 0 0)",
                  padding: "0.5rem 0.75rem",
                }}
                labelStyle={{
                  color: "oklch(0.56 0.01 250)",
                  marginBottom: "0.25rem",
                  fontWeight: 600,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: unknown, name: any) => [
                  `#${value}`,
                  name ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                      <CountryFlag code={String(name)} width={16} height={11} />
                      {String(name).toUpperCase()}
                    </span>
                  ) : (
                    ""
                  ),
                ]}
              />
              <Legend
                formatter={(value: string) => (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <CountryFlag code={value} width={16} height={11} />
                    {value.toUpperCase()}
                  </span>
                )}
                wrapperStyle={{
                  fontSize: "0.8rem",
                  color: "oklch(0.65 0.01 250)",
                  paddingTop: "0.5rem",
                }}
              />
              {countries.map((code, i) => (
                <Line
                  key={code}
                  type="monotone"
                  dataKey={code}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  name={code}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
