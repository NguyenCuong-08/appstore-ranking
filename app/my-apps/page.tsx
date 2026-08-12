import type { Metadata } from "next";
import Link from "next/link";
import { createDbClient, getLatestOverallRanks } from "@/lib/supabase/db";
import { UntrackButton } from "@/components/untrack-button";
import type { App } from "@/lib/types";

export const metadata: Metadata = {
  title: "My Apps — Toplify Web",
};

export const dynamic = "force-dynamic";

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.125rem" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill={i < full ? "var(--blue)" : i === full && hasHalf ? "url(#half)" : "none"}
          stroke="var(--blue)"
          strokeWidth="2"
          opacity={i >= full + (hasHalf ? 1 : 0) ? 0.3 : 1}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span
        style={{
          fontSize: "0.75rem",
          color: "oklch(0.65 0.01 250)",
          marginLeft: "0.25rem",
        }}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default async function MyAppsPage() {
  const supabase = createDbClient();

  const { data: tracked } = await supabase
    .from("tracked_apps")
    .select("app_id");

  if (!tracked || tracked.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h1
            style={{
              fontSize: "1.625rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "oklch(0.97 0 0)",
              margin: 0,
            }}
          >
            My Apps
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "oklch(0.56 0.01 250)",
              marginTop: "0.25rem",
            }}
          >
            Track your apps to monitor rankings over time
          </p>
        </div>

        {/* Empty state */}
        <div
          style={{
            background: "oklch(0.16 0.012 250)",
            border: "1px solid oklch(1 0 0 / 7%)",
            borderRadius: "1rem",
            padding: "3.5rem 2rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              background: "var(--blue-subtle)",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--blue)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h6v6H4z" />
              <path d="M14 4h6v6h-6z" />
              <path d="M4 14h6v6H4z" />
              <path d="M14 14h6v6h-6z" />
            </svg>
          </div>
          <div>
            <p
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "oklch(0.90 0 0)",
                margin: "0 0 0.375rem",
              }}
            >
              No apps tracked yet
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "oklch(0.56 0.01 250)",
                margin: 0,
              }}
            >
              Search for an app and click &quot;Track&quot; to start monitoring its rankings
            </p>
          </div>
          <Link
            href="/search"
            style={{
              background: "var(--blue)",
              color: "#fff",
              borderRadius: "999px",
              padding: "0.5rem 1.25rem",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
              boxShadow: "0 2px 12px rgba(59,130,246,0.35)",
              marginTop: "0.25rem",
            }}
          >
            Search Apps
          </Link>
        </div>
      </div>
    );
  }

  const appIds = tracked.map((t) => t.app_id);

  const { data: apps } = await supabase
    .from("apps")
    .select("*")
    .in("id", appIds);

  // Aggregation dùng rank MỚI NHẤT cho từng (country) — gồm cả overall + primary category.
  // KHÔNG đếm snapshot cũ (app đã rớt hạng khỏi 1 nước thì không tính nước đó nữa).
  const stats = new Map<string, { best_rank: number | null; countries_in_top: number; last_updated: string | null }>();
  for (const app of (apps ?? []) as App[]) {
    const ranks = await getLatestOverallRanks(supabase, app.id);
    const ranked = ranks.filter(
      (r) => r.rank !== null && r.rank !== undefined && (r.rank as number) <= 200
    );
    const countries = new Set(ranked.map((r) => r.country_code));
    const best = ranked.reduce<number | null>(
      (min, r) => (min === null || (r.rank as number) < min ? (r.rank as number) : min),
      null
    );
    const lastUpdated = ranks.reduce<string | null>(
      (max, r) => (r.captured_at && (!max || r.captured_at > max) ? r.captured_at : max),
      null
    );
    stats.set(app.id, {
      best_rank: best,
      countries_in_top: countries.size,
      last_updated: lastUpdated,
    });
  }

  const rows = ((apps ?? []) as App[])
    .map((app) => {
      const s = stats.get(app.id);
      return {
        app,
        bestRank: s?.best_rank ?? null,
        countriesInTop: s?.countries_in_top ?? 0,
        lastUpdated: s?.last_updated ?? null,
      };
    })
    .sort((a, b) => (a.bestRank ?? 999) - (b.bestRank ?? 999));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.625rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "oklch(0.97 0 0)",
              margin: 0,
            }}
          >
            My Apps
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "oklch(0.56 0.01 250)",
              marginTop: "0.25rem",
            }}
          >
            {rows.length} app{rows.length !== 1 ? "s" : ""} tracked · Updated every hour
          </p>
        </div>
        <Link
          href="/search"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "var(--blue)",
            color: "#fff",
            borderRadius: "999px",
            padding: "0.4375rem 1rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            textDecoration: "none",
            boxShadow: "0 2px 10px rgba(59,130,246,0.3)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
          Add App
        </Link>
      </div>

      {/* App cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {rows.map(({ app, bestRank, countriesInTop, lastUpdated }) => (
          <div
            key={app.id}
            style={{
              background: "oklch(0.16 0.012 250)",
              border: "1px solid oklch(1 0 0 / 7%)",
              borderRadius: "1rem",
              overflow: "hidden",
              transition: "border-color 150ms",
            }}
          >
            <Link href={`/app/${app.apple_id}`} style={{ textDecoration: "none", display: "block", padding: "1rem" }}>
              {/* App header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {app.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={app.icon_url}
                    alt=""
                    width={52}
                    height={52}
                    style={{
                      borderRadius: "0.875rem",
                      flexShrink: 0,
                      border: "1px solid oklch(1 0 0 / 8%)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "0.875rem",
                      background: "oklch(0.22 0.012 250)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "oklch(0.95 0 0)",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {app.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "oklch(0.56 0.01 250)",
                      marginTop: "0.125rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {app.developer}
                  </div>
                  {app.rating && <StarRating rating={app.rating} />}
                </div>
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginTop: "0.875rem",
                }}
              >
                <div
                  style={{
                    background: "oklch(0.20 0.012 250)",
                    borderRadius: "0.625rem",
                    padding: "0.5rem 0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "oklch(0.50 0.01 250)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 600,
                      marginBottom: "0.125rem",
                    }}
                  >
                    Best Rank
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color:
                        bestRank !== null && bestRank <= 10
                          ? "var(--blue)"
                          : "oklch(0.85 0 0)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {bestRank !== null ? `#${bestRank}` : "—"}
                  </div>
                </div>
                <div
                  style={{
                    background: "oklch(0.20 0.012 250)",
                    borderRadius: "0.625rem",
                    padding: "0.5rem 0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "oklch(0.50 0.01 250)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 600,
                      marginBottom: "0.125rem",
                    }}
                  >
                    Countries
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color:
                        countriesInTop > 0 ? "oklch(0.65 0.18 165)" : "oklch(0.85 0 0)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {countriesInTop > 0 ? `${countriesInTop} 🌍` : "—"}
                  </div>
                </div>
              </div>
            </Link>

            {/* Footer */}
            <div
              style={{
                borderTop: "1px solid oklch(1 0 0 / 6%)",
                padding: "0.5rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "oklch(0.44 0.01 250)",
                }}
              >
                {lastUpdated
                  ? `${new Date(lastUpdated).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "No data yet"}
              </span>
              <UntrackButton appId={app.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}