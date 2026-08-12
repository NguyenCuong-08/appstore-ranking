"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES, CHARTS, CHART_LABELS, countryName } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChartEntry } from "@/lib/types";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "games", label: "Games" },
  { value: "business", label: "Business" },
  { value: "weather", label: "Weather" },
  { value: "utilities", label: "Utilities" },
  { value: "travel", label: "Travel" },
  { value: "sports", label: "Sports" },
  { value: "social", label: "Social Networking" },
  { value: "reference", label: "Reference" },
  { value: "productivity", label: "Productivity" },
  { value: "photo-video", label: "Photo & Video" },
  { value: "news", label: "News" },
  { value: "navigation", label: "Navigation" },
  { value: "music", label: "Music" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "health-fitness", label: "Health & Fitness" },
  { value: "finance", label: "Finance" },
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "books", label: "Books" },
  { value: "medical", label: "Medical" },
  { value: "magazines", label: "Magazines & Newspapers" },
  { value: "food-drink", label: "Food & Drink" },
  { value: "shopping", label: "Shopping" },
  { value: "developer-tools", label: "Developer Tools" },
  { value: "graphics-design", label: "Graphics & Design" },
  { value: "games-action", label: "Games > Action" },
  { value: "games-adventure", label: "Games > Adventure" },
  { value: "games-arcade", label: "Games > Arcade" },
  { value: "games-board", label: "Games > Board" },
  { value: "games-card", label: "Games > Card" },
  { value: "games-casino", label: "Games > Casino" },
  { value: "games-educational", label: "Games > Educational" },
  { value: "games-family", label: "Games > Family" },
  { value: "games-kids", label: "Games > Kids" },
  { value: "games-puzzle", label: "Games > Puzzle" },
  { value: "games-racing", label: "Games > Racing" },
  { value: "games-role", label: "Games > Role Playing" },
  { value: "games-simulation", label: "Games > Simulation" },
  { value: "games-sports", label: "Games > Sports" },
  { value: "games-strategy", label: "Games > Strategy" },
  { value: "games-trivia", label: "Games > Trivia" },
  { value: "games-word", label: "Games > Word" },
];

interface ChartResponse {
  country: string;
  category: string;
  chart: string;
  limit: number;
  apps: ChartEntry[];
  updatedAt: string;
}

export function ExploreControls() {
  const [country, setCountry] = useState("us");
  const [category, setCategory] = useState("all");
  const [chart, setChart] = useState("top-free");
  const [limit, setLimit] = useState("100");
  const [apps, setApps] = useState<ChartEntry[]>([]);
  const [meta, setMeta] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const requestId = useRef(0);

  const load = useCallback(
    async ({
      country: c,
      category: cat,
      chart: ch,
      limit: lim,
    }: {
      country: string;
      category: string;
      chart: string;
      limit: string;
    }) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        country: c,
        category: cat,
        chart: ch,
        limit: lim,
      });
      try {
        const res = await fetch(`/api/charts?${params.toString()}`);
        const data = await res.json();
        if (requestId.current !== id) return;
        if (!res.ok) {
          setApps([]);
          setError(data.detail || data.error || `HTTP ${res.status}`);
        } else {
          setApps(data.apps || []);
          setMeta(data);
        }
      } catch (err) {
        if (requestId.current !== id) return;
        setApps([]);
        setError((err as Error).message);
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load({ country, category, chart, limit });
  }, [country, category, chart, limit, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || String(a.id).includes(q)
    );
  }, [apps, search]);

  const matchRank = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const found = apps.find(
      (a) => a.name.toLowerCase() === q || String(a.id) === q
    );
    return found ? found.rank : "not-found";
  }, [apps, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Country</span>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-48">
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
          <span className="text-xs text-muted-foreground">Category</span>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex gap-1">
          {CHARTS.map((ch) => (
            <Button
              key={ch}
              type="button"
              variant={chart === ch ? "default" : "outline"}
              size="sm"
              onClick={() => setChart(ch)}
            >
              {CHART_LABELS[ch]}
            </Button>
          ))}
        </div>

        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Limit</span>
          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["100", "50", "25", "10"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="relative flex-1 min-w-56">
          <Input
            placeholder="Search by app name or app ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {matchRank !== null && matchRank !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                matchRank === "not-found" && "text-destructive"
              )}
            >
              {matchRank === "not-found"
                ? "Not in chart"
                : `Rank #${matchRank}`}
            </Badge>
          )}
        </div>
      </div>

      {meta && (
        <p className="text-xs text-muted-foreground">
          {countryName(meta.country)} ·{" "}
          {CATEGORIES.find((c) => c.value === meta.category)?.label ??
            meta.category}{" "}
          · {CHART_LABELS[meta.chart as keyof typeof CHART_LABELS]} ·{" "}
          {meta.apps.length} apps · updated{" "}
          {new Date(meta.updatedAt).toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <strong>Lỗi:</strong> {error}
          <Button
            className="ml-2"
            variant="outline"
            size="sm"
            onClick={() => load({ country, category, chart, limit })}
          >
            Thử lại
          </Button>
        </div>
      )}

      {!error && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-14"></TableHead>
                <TableHead>App</TableHead>
                <TableHead>Developer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => (
                <TableRow key={app.id} className={app.rank <= 3 ? "bg-muted/40" : undefined}>
                  <TableCell className="font-medium">{app.rank}</TableCell>
                  <TableCell>
                    {app.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.icon}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-md"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/app/${app.id}`}
                      className="font-medium hover:underline"
                    >
                      {app.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      ID {app.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {app.developer}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Không tìm thấy app nào khớp với từ khoá “{search}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
