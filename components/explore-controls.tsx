"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES, CHARTS, CHART_LABELS, countryName } from "@/lib/constants";
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
  { value: "games-action", label: "Games › Action" },
  { value: "games-adventure", label: "Games › Adventure" },
  { value: "games-arcade", label: "Games › Arcade" },
  { value: "games-board", label: "Games › Board" },
  { value: "games-card", label: "Games › Card" },
  { value: "games-casino", label: "Games › Casino" },
  { value: "games-educational", label: "Games › Educational" },
  { value: "games-family", label: "Games › Family" },
  { value: "games-kids", label: "Games › Kids" },
  { value: "games-puzzle", label: "Games › Puzzle" },
  { value: "games-racing", label: "Games › Racing" },
  { value: "games-role", label: "Games › Role Playing" },
  { value: "games-simulation", label: "Games › Simulation" },
  { value: "games-sports", label: "Games › Sports" },
  { value: "games-strategy", label: "Games › Strategy" },
  { value: "games-trivia", label: "Games › Trivia" },
  { value: "games-word", label: "Games › Word" },
];

// Country flag from ISO code using emoji
function countryFlag(code: string) {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface ChartResponse {
  country: string;
  category: string;
  chart: string;
  limit: number;
  apps: ChartEntry[];
  updatedAt: string;
}

function TrackBtn({ appId, appName }: { appId: string; appName: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleTrack(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState("loading");
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: appId }),
      });
      if (!res.ok) throw new Error("Failed");
      setState("done");
    } catch {
      setState("idle");
    }
  }

  if (state === "done")
    return (
      <span
        style={{
          fontSize: "0.75rem",
          color: "oklch(0.65 0.18 165)",
          fontWeight: 600,
          padding: "0.25rem 0.625rem",
        }}
      >
        ✓ Tracked
      </span>
    );

  return (
    <button
      className="btn-track"
      onClick={handleTrack}
      disabled={state === "loading"}
      title={`Track ${appName}`}
    >
      {state === "loading" ? "…" : "+ Track"}
    </button>
  );
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
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [showCategoryDrop, setShowCategoryDrop] = useState(false);
  const requestId = useRef(0);
  const countryRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node))
        setShowCountryDrop(false);
      if (
        categoryRef.current &&
        !categoryRef.current.contains(e.target as Node)
      )
        setShowCategoryDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const currentCountry = COUNTRIES.find((c) => c.code === country);
  const currentCategory =
    CATEGORIES.find((c) => c.value === category)?.label ?? "All Categories";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Controls bar */}
      <div
        style={{
          background: "oklch(0.16 0.012 250)",
          border: "1px solid oklch(1 0 0 / 7%)",
          borderRadius: "1rem",
          padding: "0.875rem 1rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.625rem",
        }}
      >
        {/* Country picker */}
        <div ref={countryRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowCountryDrop((v) => !v);
              setShowCategoryDrop(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "oklch(0.22 0.012 250)",
              border: "1px solid oklch(1 0 0 / 8%)",
              borderRadius: "0.5rem",
              padding: "0.375rem 0.625rem",
              cursor: "pointer",
              color: "oklch(0.96 0 0)",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "background 120ms",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>
              {countryFlag(country)}
            </span>
            <span>{currentCountry?.name ?? country.toUpperCase()}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                opacity: 0.5,
                transform: showCountryDrop ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showCountryDrop && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 100,
                background: "oklch(0.18 0.012 250)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: "0.75rem",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                width: "220px",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "0.5rem" }}>
                <input
                  autoFocus
                  placeholder="Search country…"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: "oklch(0.22 0.012 250)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    borderRadius: "0.5rem",
                    padding: "0.375rem 0.625rem",
                    fontSize: "0.8125rem",
                    color: "oklch(0.96 0 0)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div
                style={{
                  maxHeight: "280px",
                  overflowY: "auto",
                  padding: "0.25rem 0.375rem 0.5rem",
                }}
                className="app-list-scroll"
              >
                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code);
                      setShowCountryDrop(false);
                      setCountrySearch("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%",
                      padding: "0.375rem 0.5rem",
                      borderRadius: "0.375rem",
                      background:
                        c.code === country
                          ? "var(--blue-subtle)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      color:
                        c.code === country
                          ? "var(--blue)"
                          : "oklch(0.85 0.01 250)",
                      fontSize: "0.8125rem",
                      fontWeight: c.code === country ? 600 : 400,
                      textAlign: "left",
                      transition: "background 100ms",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{countryFlag(c.code)}</span>
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        opacity: 0.45,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {c.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart toggle */}
        <div className="chart-toggle">
          {CHARTS.map((ch) => (
            <button
              key={ch}
              className={cn("chart-toggle-btn", chart === ch && "active")}
              onClick={() => setChart(ch)}
            >
              {CHART_LABELS[ch]}
            </button>
          ))}
        </div>

        {/* Category picker */}
        <div ref={categoryRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowCategoryDrop((v) => !v);
              setShowCountryDrop(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "oklch(0.22 0.012 250)",
              border: "1px solid oklch(1 0 0 / 8%)",
              borderRadius: "0.5rem",
              padding: "0.375rem 0.625rem",
              cursor: "pointer",
              color: "oklch(0.96 0 0)",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            <span>{currentCategory}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                opacity: 0.5,
                transform: showCategoryDrop ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showCategoryDrop && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 100,
                background: "oklch(0.18 0.012 250)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: "0.75rem",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                width: "200px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  padding: "0.375rem",
                }}
                className="app-list-scroll"
              >
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setCategory(c.value);
                      setShowCategoryDrop(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "0.375rem 0.5rem",
                      borderRadius: "0.375rem",
                      background:
                        c.value === category
                          ? "var(--blue-subtle)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      color:
                        c.value === category
                          ? "var(--blue)"
                          : "oklch(0.85 0.01 250)",
                      fontSize: "0.8125rem",
                      fontWeight: c.value === category ? 600 : 400,
                      textAlign: "left",
                      transition: "background 100ms",
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Limit select */}
        <select
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          style={{
            background: "oklch(0.22 0.012 250)",
            border: "1px solid oklch(1 0 0 / 8%)",
            borderRadius: "0.5rem",
            padding: "0.375rem 0.625rem",
            cursor: "pointer",
            color: "oklch(0.96 0 0)",
            fontSize: "0.875rem",
            fontWeight: 500,
            outline: "none",
          }}
        >
          {["10", "25", "50", "100"].map((l) => (
            <option key={l} value={l} style={{ background: "oklch(0.18 0.012 250)" }}>
              Top {l}
            </option>
          ))}
        </select>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.4,
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder="Filter by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "oklch(0.22 0.012 250)",
              border: "1px solid oklch(1 0 0 / 8%)",
              borderRadius: "0.5rem",
              padding: "0.375rem 0.625rem 0.375rem 2rem",
              color: "oklch(0.96 0 0)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
          {matchRank !== null && matchRank !== undefined && (
            <span
              style={{
                position: "absolute",
                right: "0.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.125rem 0.5rem",
                borderRadius: "999px",
                background:
                  matchRank === "not-found"
                    ? "rgba(239,68,68,0.15)"
                    : "var(--blue-dim)",
                color:
                  matchRank === "not-found" ? "#ef4444" : "var(--blue)",
              }}
            >
              {matchRank === "not-found" ? "Not in chart" : `#${matchRank}`}
            </span>
          )}
        </div>
      </div>

      {/* Meta info */}
      {meta && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 0.25rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              color: "oklch(0.56 0.01 250)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>{countryFlag(meta.country)}</span>
            <span>{countryName(meta.country)}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              {CATEGORIES.find((c) => c.value === meta.category)?.label ??
                meta.category}
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{meta.apps.length} apps</span>
          </span>
          <span style={{ fontSize: "0.75rem", color: "oklch(0.44 0.01 250)" }}>
            Updated {new Date(meta.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "0.75rem",
            padding: "0.875rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "0.875rem", color: "#ef4444" }}>
            <strong>Error:</strong> {error}
          </span>
          <button
            onClick={() => load({ country, category, chart, limit })}
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
              borderRadius: "0.5rem",
              padding: "0.25rem 0.75rem",
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* App list */}
      {!error && (
        <div
          style={{
            background: "oklch(0.16 0.012 250)",
            border: "1px solid oklch(1 0 0 / 7%)",
            borderRadius: "1rem",
            overflow: "hidden",
          }}
        >
          {/* Skeleton while loading */}
          {loading && apps.length === 0 && (
            <div style={{ padding: "0.5rem" }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.625rem 0.875rem",
                  }}
                >
                  <div
                    className="skeleton"
                    style={{ width: "2rem", height: "1.1rem", borderRadius: "0.25rem" }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    <div className="skeleton" style={{ width: "55%", height: "0.875rem" }} />
                    <div className="skeleton" style={{ width: "35%", height: "0.75rem" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* App rows */}
          {filtered.length > 0 && (
            <div style={{ padding: "0.375rem" }}>
              {filtered.map((app) => (
                <Link
                  key={app.id}
                  href={`/app/${app.id}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div className="app-row">
                    {/* Rank */}
                    <span
                      className={cn(
                        "rank-num",
                        app.rank <= 3 && "rank-top3"
                      )}
                    >
                      {app.rank}
                    </span>

                    {/* Icon */}
                    {app.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.icon}
                        alt=""
                        width={44}
                        height={44}
                        style={{
                          borderRadius: "0.6875rem",
                          flexShrink: 0,
                          border: "1px solid oklch(1 0 0 / 6%)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "0.6875rem",
                          background: "oklch(0.22 0.012 250)",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Name + developer */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: "0.9375rem",
                          color: "oklch(0.95 0 0)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {app.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          color: "oklch(0.56 0.01 250)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: "0.125rem",
                        }}
                      >
                        {app.developer}
                      </div>
                    </div>

                    {/* Track button */}
                    <TrackBtn appId={String(app.id)} appName={app.name} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Loading overlay when refreshing */}
          {loading && apps.length > 0 && (
            <div
              style={{
                padding: "0.5rem",
                textAlign: "center",
                fontSize: "0.8125rem",
                color: "oklch(0.56 0.01 250)",
                borderTop: "1px solid oklch(1 0 0 / 6%)",
              }}
            >
              Refreshing…
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div
              style={{
                padding: "3rem 1rem",
                textAlign: "center",
                color: "oklch(0.56 0.01 250)",
                fontSize: "0.9375rem",
              }}
            >
              {search
                ? `No apps match "${search}" in this chart`
                : "No data yet. Waiting for sync…"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
