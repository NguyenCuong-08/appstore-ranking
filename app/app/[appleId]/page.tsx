import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createDbClient } from "@/lib/supabase/db";
import { countryName } from "@/lib/constants";
import type { ChartType, LatestRank, LatestRankRow } from "@/lib/types";
import { RankHistoryChart } from "@/components/rank-history-chart";
import { CountryPicker } from "@/components/country-picker";
import { AlertManager } from "@/components/alert-manager";
import { TrackButton } from "@/components/track-button";

export const metadata: Metadata = {
  title: "App Details — Toplify Web",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ appleId: string }>;
}

function rankingScore(ranks: LatestRank[]): number | null {
  const ranked = ranks.filter((r) => r.rank !== null && r.rank !== undefined);
  if (ranked.length === 0) return null;
  const sum = ranked.reduce((acc, r) => acc + (201 - (r.rank as number)), 0);
  return Math.round((sum / ranked.length) * 100) / 100;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(0, Math.floor(diff / 60000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function countryFlag(code: string) {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getRankColor(rank: number | null): string {
  if (!rank) return "oklch(0.85 0 0)";
  if (rank <= 3) return "#fbbf24";
  if (rank <= 10) return "var(--blue)";
  if (rank <= 50) return "oklch(0.65 0.18 165)";
  return "oklch(0.75 0.01 250)";
}

export default async function AppDetailPage({ params }: PageProps) {
  const { appleId } = await params;
  const supabase = createDbClient();

  const { data: app } = await supabase
    .from("apps")
    .select("*")
    .eq("apple_id", appleId)
    .maybeSingle();

  if (!app) {
    notFound();
  }

  const { data: ta } = await supabase
    .from("tracked_apps")
    .select("pinned_countries")
    .eq("app_id", app.id)
    .maybeSingle();

  const tracking = Boolean(ta);
  const pinnedCountries: string[] = ta?.pinned_countries ?? [];

  const { data: latestRanks } = await supabase.rpc("get_latest_ranks", {
    target_app_id: app.id,
  });
  const ranks: LatestRank[] = ((latestRanks ?? []) as LatestRankRow[]).map(
    (r) => ({
      country_code: r.country_code,
      chart_type: r.chart_type as ChartType,
      rank: r.rank,
      captured_at: r.captured_at,
    })
  );

  const score = rankingScore(ranks);
  const rankedRows = ranks.filter(
    (r) => r.rank !== null && r.rank !== undefined
  );
  const countriesInTop = new Set(
    rankedRows.filter((r) => (r.rank as number) <= 200).map((r) => r.country_code)
  ).size;
  const lastUpdated =
    ranks.length > 0
      ? ranks.map((r) => r.captured_at).sort().reverse()[0]
      : null;

  // Group by country
  const byCountry = new Map<
    string,
    { free: number | null; paid: number | null; grossing: number | null; best: number | null }
  >();
  for (const r of ranks) {
    const row =
      byCountry.get(r.country_code) ??
      { free: null, paid: null, grossing: null, best: null };
    if (r.chart_type === "top-free") row.free = r.rank;
    else if (r.chart_type === "top-paid") row.paid = r.rank;
    else row.grossing = r.rank;
    if (r.rank !== null && r.rank !== undefined) {
      row.best = row.best === null ? r.rank : Math.min(row.best, r.rank);
    }
    byCountry.set(r.country_code, row);
  }
  const countryRanks = [...byCountry.entries()]
    .map(([code, row]) => ({ code, ...row }))
    .filter((r) => r.best !== null)
    .sort((a, b) => (a.best ?? 999) - (b.best ?? 999));

  const stats = [
    {
      label: "Rating",
      value: app.rating !== null ? app.rating.toFixed(1) : "—",
      sub: "out of 5",
      accent: false,
    },
    {
      label: "Reviews",
      value: app.rating_count ? formatNumber(app.rating_count) : "—",
      sub: "total",
      accent: false,
    },
    {
      label: "Countries",
      value: String(countriesInTop),
      sub: "in Top 200",
      accent: countriesInTop > 0,
    },
    {
      label: "Score",
      value: score !== null ? String(score) : "—",
      sub: "ranking score",
      accent: false,
    },
    {
      label: "Updated",
      value: timeAgo(lastUpdated),
      sub: "last sync",
      accent: false,
    },
    {
      label: "Price",
      value: app.price === 0 ? "Free" : `$${app.price}`,
      sub: app.price === 0 ? "No cost" : "paid app",
      accent: false,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* App Header Card */}
      <div
        style={{
          background: "oklch(0.16 0.012 250)",
          border: "1px solid oklch(1 0 0 / 7%)",
          borderRadius: "1rem",
          padding: "1.25rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {app.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.icon_url}
            alt=""
            width={80}
            height={80}
            style={{
              borderRadius: "1.125rem",
              flexShrink: 0,
              border: "1px solid oklch(1 0 0 / 8%)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "1.125rem",
              background: "oklch(0.22 0.012 250)",
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "oklch(0.97 0 0)",
              margin: "0 0 0.25rem",
              lineHeight: 1.2,
            }}
          >
            {app.name}
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "oklch(0.60 0.01 250)",
              margin: "0 0 0.625rem",
            }}
          >
            {app.developer}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                background: app.price === 0 ? "oklch(0.65 0.18 165 / 15%)" : "var(--blue-dim)",
                color: app.price === 0 ? "oklch(0.65 0.18 165)" : "var(--blue)",
                border: `1px solid ${app.price === 0 ? "oklch(0.65 0.18 165 / 30%)" : "rgba(59,130,246,0.3)"}`,
                borderRadius: "999px",
                padding: "0.1875rem 0.625rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
              }}
            >
              {app.price === 0 ? "Free" : `$${app.price}`}
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                color: "oklch(0.44 0.01 250)",
              }}
            >
              ID {app.apple_id}
            </span>
            <a
              href={`https://apps.apple.com/app/id${app.apple_id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.8125rem",
                color: "var(--blue)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              App Store
            </a>
          </div>
        </div>

        {!tracking && <TrackButton appId={app.id} />}
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.625rem",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "oklch(0.16 0.012 250)",
              border: "1px solid oklch(1 0 0 / 7%)",
              borderRadius: "0.875rem",
              padding: "0.875rem 1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.6875rem",
                color: "oklch(0.50 0.01 250)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: stat.accent ? "oklch(0.65 0.18 165)" : "oklch(0.92 0 0)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "oklch(0.44 0.01 250)",
                marginTop: "0.25rem",
              }}
            >
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Pinned countries (if tracking) */}
      {tracking && (
        <CountryPicker appId={app.id} initialPinned={pinnedCountries} />
      )}

      {/* Ranking history chart */}
      <section
        style={{
          background: "oklch(0.16 0.012 250)",
          border: "1px solid oklch(1 0 0 / 7%)",
          borderRadius: "1rem",
          padding: "1.25rem",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "oklch(0.97 0 0)",
            margin: "0 0 1rem",
          }}
        >
          Ranking History
        </h2>
        <RankHistoryChart appId={app.id} pinnedCountries={pinnedCountries} />
      </section>

      {/* Country ranking table */}
      {countryRanks.length > 0 && (
        <section
          style={{
            background: "oklch(0.16 0.012 250)",
            border: "1px solid oklch(1 0 0 / 7%)",
            borderRadius: "1rem",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "oklch(0.97 0 0)",
                margin: 0,
              }}
            >
              Rankings by Country
            </h2>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "oklch(0.50 0.01 250)",
                margin: "0.25rem 0 0",
              }}
            >
              Current positions · Top 200 · {countryRanks.length} countries
            </p>
          </div>
          <div
            style={{ maxHeight: "480px", overflowY: "auto" }}
            className="app-list-scroll"
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "oklch(0.18 0.012 250)",
                    zIndex: 1,
                  }}
                >
                  <th
                    style={{
                      padding: "0.625rem 1.25rem",
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      color: "oklch(0.50 0.01 250)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Country
                  </th>
                  <th
                    style={{
                      padding: "0.625rem 1rem",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      color: "oklch(0.50 0.01 250)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Free
                  </th>
                  <th
                    style={{
                      padding: "0.625rem 1rem",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      color: "oklch(0.50 0.01 250)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Paid
                  </th>
                  <th
                    style={{
                      padding: "0.625rem 1.25rem",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      color: "oklch(0.50 0.01 250)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Best
                  </th>
                </tr>
              </thead>
              <tbody>
                {countryRanks.map((r, idx) => (
                  <tr
                    key={r.code}
                    style={{
                      borderTop: "1px solid oklch(1 0 0 / 4%)",
                      background: pinnedCountries.includes(r.code)
                        ? "var(--blue-subtle)"
                        : idx % 2 === 0
                        ? "transparent"
                        : "oklch(1 0 0 / 1.5%)",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.625rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>{countryFlag(r.code)}</span>
                      <span
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "oklch(0.75 0.01 250)",
                        }}
                      >
                        {r.code}
                      </span>
                      <span style={{ color: "oklch(0.65 0.01 250)", fontSize: "0.875rem", fontWeight: 400 }}>
                        {countryName(r.code)}
                      </span>
                      {pinnedCountries.includes(r.code) && (
                        <span
                          style={{
                            background: "var(--blue-dim)",
                            color: "var(--blue)",
                            borderRadius: "999px",
                            padding: "0 0.375rem",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                          }}
                        >
                          PINNED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.625rem 1rem", textAlign: "right", fontWeight: 700, color: getRankColor(r.free) }}>
                      {r.free !== null ? `#${r.free}` : "—"}
                    </td>
                    <td style={{ padding: "0.625rem 1rem", textAlign: "right", fontWeight: 700, color: getRankColor(r.paid) }}>
                      {r.paid !== null ? `#${r.paid}` : "—"}
                    </td>
                    <td style={{ padding: "0.625rem 1.25rem", textAlign: "right", fontWeight: 700, color: getRankColor(r.best) }}>
                      {r.best !== null ? `#${r.best}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tracking && <AlertManager appId={app.id} />}
    </div>
  );
}