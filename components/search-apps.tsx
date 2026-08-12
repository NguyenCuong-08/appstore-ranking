"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { LookupApp } from "@/lib/types";

export function SearchApps() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LookupApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error);
        setResults(data.results ?? []);
      } catch (err) {
        setError((err as Error).message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [q]);

  async function track(app: LookupApp) {
    const id = String(app.trackId);
    setTracking(id);
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to track");
      toast.success(`Added ${data.app.name} to My Apps`);
      setTracked((prev) => new Set([...prev, id]));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTracking(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            left: "0.875rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "oklch(0.45 0.01 250)",
            pointerEvents: "none",
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          placeholder="Search by app name or paste App Store URL…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "oklch(0.16 0.012 250)",
            border: "1px solid oklch(1 0 0 / 10%)",
            borderRadius: "0.875rem",
            padding: "0.875rem 0.875rem 0.875rem 2.75rem",
            color: "oklch(0.96 0 0)",
            fontSize: "1rem",
            outline: "none",
            transition: "border-color 150ms",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)";
          }}
        />
        {loading && (
          <div
            style={{
              position: "absolute",
              right: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "1rem",
              height: "1rem",
              borderRadius: "50%",
              border: "2px solid oklch(1 0 0 / 15%)",
              borderTopColor: "var(--blue)",
              animation: "spin 0.7s linear infinite",
            }}
          />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div
          style={{
            background: "oklch(0.16 0.012 250)",
            border: "1px solid oklch(1 0 0 / 7%)",
            borderRadius: "1rem",
            overflow: "hidden",
          }}
        >
          {results.map((app, idx) => {
            const id = String(app.trackId);
            const isTracked = tracked.has(id);
            const isTracking = tracking === id;
            return (
              <div
                key={app.trackId}
                style={{
                  borderTop: idx > 0 ? "1px solid oklch(1 0 0 / 5%)" : "none",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                }}
              >
                {/* Icon */}
                {app.artworkUrl100 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={app.artworkUrl100}
                    alt=""
                    width={48}
                    height={48}
                    style={{
                      borderRadius: "0.75rem",
                      flexShrink: 0,
                      border: "1px solid oklch(1 0 0 / 6%)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "0.75rem",
                      background: "oklch(0.22 0.012 250)",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/app/${app.trackId}`}
                    style={{
                      display: "block",
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "oklch(0.95 0 0)",
                      textDecoration: "none",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {app.trackName}
                  </Link>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.1875rem",
                    }}
                  >
                    <span style={{ fontSize: "0.8125rem", color: "oklch(0.56 0.01 250)" }}>
                      {app.artistName}
                    </span>
                    <span
                      style={{
                        background: "oklch(0.22 0.012 250)",
                        color: "oklch(0.50 0.01 250)",
                        borderRadius: "0.3rem",
                        padding: "0.0625rem 0.375rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                      }}
                    >
                      ID {app.trackId}
                    </span>
                    {app.price === 0 ? (
                      <span style={{ fontSize: "0.75rem", color: "oklch(0.65 0.18 165)", fontWeight: 600 }}>
                        Free
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "oklch(0.65 0.01 250)", fontWeight: 600 }}>
                        ${app.price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Track button */}
                <button
                  onClick={() => track(app)}
                  disabled={isTracking || isTracked}
                  style={{
                    background: isTracked
                      ? "oklch(0.65 0.18 165 / 12%)"
                      : "var(--blue-dim)",
                    color: isTracked ? "oklch(0.65 0.18 165)" : "var(--blue)",
                    border: `1px solid ${isTracked ? "oklch(0.65 0.18 165 / 30%)" : "rgba(59,130,246,0.3)"}`,
                    borderRadius: "999px",
                    padding: "0.375rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: isTracked ? "default" : isTracking ? "wait" : "pointer",
                    transition: "all 150ms ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {isTracked ? "✓ Tracked" : isTracking ? "Adding…" : "+ Track"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!loading && q.trim().length >= 2 && results.length === 0 && !error && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "oklch(0.50 0.01 250)",
            fontSize: "0.9375rem",
          }}
        >
          No results for &ldquo;{q}&rdquo;
        </div>
      )}

      {/* Hint */}
      {q.trim().length < 2 && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "oklch(0.44 0.01 250)",
            textAlign: "center",
            marginTop: "0.5rem",
          }}
        >
          Type at least 2 characters · You can also paste an App Store URL like{" "}
          <code
            style={{
              background: "oklch(0.20 0.012 250)",
              padding: "0.125rem 0.375rem",
              borderRadius: "0.3rem",
              fontSize: "0.75rem",
            }}
          >
            apps.apple.com/…/id123456
          </code>
        </p>
      )}
    </div>
  );
}
