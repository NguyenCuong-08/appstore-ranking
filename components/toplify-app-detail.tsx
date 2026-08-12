"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { countryName } from "@/lib/constants";
import { RankHistoryChart } from "@/components/rank-history-chart";
import { CountryPicker } from "@/components/country-picker";
import { AlertManager } from "@/components/alert-manager";
import { TrackButton } from "@/components/track-button";
import { UntrackButton } from "@/components/untrack-button";

interface AppDetailProps {
  app: {
    id: string;
    apple_id: string;
    name: string;
    developer: string;
    icon_url: string | null;
    price: number | null;
    rating: number | null;
    rating_count: number | null;
  };
  tracking: boolean;
  pinnedCountries: string[];
  countryRanks: Array<{
    code: string;
    free: number | null;
    paid: number | null;
    best: number | null;
  }>;
  score: number | null;
  countriesInTop: number;
}

function countryFlag(code: string) {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// 5 Stars rating render
function StarRating({ rating }: { rating: number | null }) {
  const val = rating ?? 0;
  const full = Math.floor(val);
  const hasHalf = val - full >= 0.5;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i < full;
        const isHalf = i === full && hasHalf;
        return (
          <span
            key={i}
            style={{
              color: isFilled || isHalf ? "#ffcc00" : "#3a3a3c",
              fontSize: "0.85rem",
              lineHeight: 1,
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

// Visual Bar Meter for Score (matching Toplify screenshot)
function ScoreBarMeter({ score }: { score: number | null }) {
  const maxScore = 100; // max possible score
  const currentScore = score ?? 0;
  const totalBars = 16;
  const activeBars = Math.min(
    totalBars,
    Math.max(1, Math.round((currentScore / maxScore) * totalBars))
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
      {Array.from({ length: totalBars }).map((_, i) => {
        const isActive = i < activeBars;
        return (
          <div
            key={i}
            style={{
              width: "4px",
              height: "24px",
              borderRadius: "2px",
              background: isActive ? "#30d158" : "#2c2c2e",
              transition: "background 200ms ease",
            }}
          />
        );
      })}
    </div>
  );
}

export function ToplifyAppDetail({
  app,
  tracking,
  pinnedCountries,
  countryRanks,
  score,
  countriesInTop,
}: AppDetailProps) {
  const router = useRouter();
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterPinnedOnly, setFilterPinnedOnly] = useState<boolean>(false);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [showHistoryChart, setShowHistoryChart] = useState<boolean>(true);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Filter and sort country ranks
  let displayedCountries = countryRanks.filter((r) => r.best !== null);
  if (filterPinnedOnly && pinnedCountries.length > 0) {
    displayedCountries = displayedCountries.filter((r) =>
      pinnedCountries.includes(r.code)
    );
  }

  displayedCountries.sort((a, b) => {
    const rankA = a.best ?? 999;
    const rankB = b.best ?? 999;
    if (rankA === rankB)
      return countryName(a.code).localeCompare(countryName(b.code));
    return sortAsc ? rankA - rankB : rankB - rankA;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "600px",
        margin: "0 auto",
        paddingBottom: "4rem",
      }}
    >
      {/* 1. Top Navigation Bar with Back & Menu */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.25rem 0",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "50%",
            background: "#1c1c1e",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              background: "#1c1c1e",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Options"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {/* Action Menu Dropdown */}
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "110%",
                right: 0,
                zIndex: 100,
                background: "#2c2c2e",
                borderRadius: "0.875rem",
                padding: "0.5rem",
                boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
                minWidth: "180px",
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              <button
                onClick={() => {
                  setShowPicker((v) => !v);
                  setShowMenu(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>📌</span> {showPicker ? "Hide Pin Picker" : "Pin Countries"}
              </button>
              <button
                onClick={() => {
                  setShowHistoryChart((v) => !v);
                  setShowMenu(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>📈</span> {showHistoryChart ? "Hide Chart" : "Show Chart"}
              </button>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />
              <div style={{ padding: "0.25rem 0.5rem" }}>
                {tracking ? (
                  <UntrackButton appId={app.id} />
                ) : (
                  <TrackButton appId={app.id} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Status Row (Free tag + Open in App Store) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "#30d158",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#30d158",
              display: "inline-block",
            }}
          />
          {app.price === 0 || app.price === null ? "Free" : `$${app.price}`}
        </div>

        <a
          href={`https://apps.apple.com/app/id${app.apple_id}`}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#30d158",
            fontSize: "0.875rem",
            fontWeight: 500,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          Open in App Store
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </div>

      {/* 3. Main App Card (Toplify Banner) */}
      <div
        style={{
          background: "#1c1c1e",
          borderRadius: "1.25rem",
          padding: "1rem 1.25rem",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {/* Left Side: App Icon + Name + Developer */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0 }}>
          {app.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.icon_url}
              alt=""
              width={56}
              height={56}
              style={{
                borderRadius: "0.875rem",
                flexShrink: 0,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "0.875rem",
                background: "#2c2c2e",
                flexShrink: 0,
              }}
            />
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 0.125rem",
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {app.name}
            </h1>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#8e8e93",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {app.developer || "Developer"}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "48px", background: "#2c2c2e" }} />

        {/* Right Side: Rating + Ratings count + Stars */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            {app.rating ? app.rating.toFixed(1) : "—"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#8e8e93",
              marginTop: "0.25rem",
              marginBottom: "0.25rem",
              whiteSpace: "nowrap",
            }}
          >
            {app.rating_count ? `${formatNumber(app.rating_count)} ratings` : "No ratings"}
          </div>
          <StarRating rating={app.rating} />
        </div>
      </div>

      {/* 4. Metrics Cards (2 side-by-side) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "0.75rem" }}>
        {/* Left Metric Card: Countries */}
        <div
          style={{
            background: "#1c1c1e",
            borderRadius: "1.25rem",
            padding: "1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            {countriesInTop}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#8e8e93", marginTop: "0.375rem" }}>
            Countries
          </div>
        </div>

        {/* Right Metric Card: Score + Visual Meter */}
        <div
          style={{
            background: "#1c1c1e",
            borderRadius: "1.25rem",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.1,
              }}
            >
              {score !== null ? score.toFixed(1) : "—"}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#8e8e93", marginTop: "0.375rem" }}>
              Score
            </div>
          </div>
          <ScoreBarMeter score={score} />
        </div>
      </div>

      {/* Optional Pin Country Picker Modal / Accordion */}
      {showPicker && tracking && (
        <CountryPicker appId={app.id} initialPinned={pinnedCountries} />
      )}

      {/* Optional Ranking History Chart */}
      {showHistoryChart && (
        <div
          style={{
            background: "#1c1c1e",
            borderRadius: "1.25rem",
            padding: "1rem 1.25rem",
          }}
        >
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "0.75rem",
              letterSpacing: "-0.01em",
            }}
          >
            RANKING HISTORY
          </div>
          <RankHistoryChart appId={app.id} pinnedCountries={pinnedCountries} />
        </div>
      )}

      {/* 5. TOP RANKING Section Header & Sort Pill Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "0.5rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            TOP RANKING
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#8e8e93", marginTop: "0.125rem" }}>
            iOS Charts
          </div>
        </div>

        {/* Filter / Sort Control Pill */}
        <div
          style={{
            background: "#2c2c2e",
            borderRadius: "999px",
            padding: "3px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <button
            onClick={() => setSortAsc(true)}
            style={{
              background: sortAsc ? "#3a3a3c" : "transparent",
              color: "#ffffff",
              border: "none",
              borderRadius: "999px",
              padding: "0.25rem 0.625rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>≡ Rank</span>
          </button>
          <button
            onClick={() => setSortAsc(true)}
            style={{
              background: sortAsc ? "#3a3a3c" : "transparent",
              color: sortAsc ? "#30d158" : "#8e8e93",
              border: "none",
              borderRadius: "999px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
            title="Sort Ascending"
          >
            ↑
          </button>
          <button
            onClick={() => setSortAsc(false)}
            style={{
              background: !sortAsc ? "#3a3a3c" : "transparent",
              color: !sortAsc ? "#30d158" : "#8e8e93",
              border: "none",
              borderRadius: "999px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
            title="Sort Descending"
          >
            ↓
          </button>
          {pinnedCountries.length > 0 && (
            <button
              onClick={() => setFilterPinnedOnly((v) => !v)}
              style={{
                background: filterPinnedOnly ? "#30d158" : "transparent",
                color: filterPinnedOnly ? "#000000" : "#8e8e93",
                border: "none",
                borderRadius: "999px",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
              title="Filter Pinned"
            >
              📌
            </button>
          )}
        </div>
      </div>

      {/* 6. Country Ranking List */}
      <div
        style={{
          background: "#1c1c1e",
          borderRadius: "1.25rem",
          padding: "0.5rem 0.75rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {displayedCountries.map((r, idx) => (
          <div
            key={r.code}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.875rem 0.625rem",
              borderBottom:
                idx < displayedCountries.length - 1
                  ? "1px solid #2c2c2e"
                  : "none",
            }}
          >
            {/* Country Flag & Name */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>
                {countryFlag(r.code)}
              </span>
              <span
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "#ffffff",
                }}
              >
                {countryName(r.code)}
              </span>
            </div>

            {/* Rank Pill Badge */}
            <div
              style={{
                background: "#2c2c2e",
                borderRadius: "999px",
                padding: "0.25rem 0.875rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: r.best && r.best <= 3 ? "#ffcc00" : "#ffffff",
                minWidth: "2.25rem",
                textAlign: "center",
              }}
            >
              {r.best ?? "—"}
            </div>
          </div>
        ))}

        {displayedCountries.length === 0 && (
          <div
            style={{
              padding: "2rem 1rem",
              textAlign: "center",
              color: "#8e8e93",
              fontSize: "0.875rem",
            }}
          >
            No country rankings found
          </div>
        )}
      </div>

      {tracking && <AlertManager appId={app.id} />}
    </div>
  );
}
