import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createDbClient } from "@/lib/supabase/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { countryName } from "@/lib/constants";
import type { ChartType, LatestRank, LatestRankRow } from "@/lib/types";
import { RankHistoryChart } from "@/components/rank-history-chart";
import { CountryPicker } from "@/components/country-picker";
import { AlertManager } from "@/components/alert-manager";
import { TrackButton } from "@/components/track-button";

export const metadata: Metadata = {
  title: "App — App Store Ranking",
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
  if (hours < 1) return `${Math.max(0, Math.floor(diff / 60000))} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
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

  // Gộp theo nước: rank hiện tại từng chart + best position
  const byCountry = new Map<
    string,
    {
      free: number | null;
      paid: number | null;
      grossing: number | null;
      best: number | null;
    }
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

  const tiles = [
    { label: "Rating", value: app.rating !== null ? `${app.rating} ★` : "—" },
    {
      label: "Reviews",
      value: app.rating_count ? formatNumber(app.rating_count) : "—",
    },
    { label: "Countries (Top 200)", value: String(countriesInTop) },
    { label: "Score", value: score !== null ? String(score) : "—" },
    {
      label: "Cập nhật",
      value: timeAgo(lastUpdated),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {app.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.icon_url}
            alt=""
            width={72}
            height={72}
            className="rounded-2xl"
          />
        ) : (
          <div className="h-[72px] w-[72px] rounded-2xl bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight">{app.name}</h1>
          <div className="text-sm text-muted-foreground">
            {app.developer} ·{" "}
            <a
              href={`https://apps.apple.com/app/id${app.apple_id}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              Mở trên App Store
            </a>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">
              {app.price === 0 ? "Free" : `$${app.price}`}
            </Badge>
            <span className="text-muted-foreground">ID {app.apple_id}</span>
          </div>
        </div>
        {!tracking && <TrackButton appId={app.id} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="text-xs text-muted-foreground">{t.label}</span>
              <span className="text-lg font-semibold">{t.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {tracking && <CountryPicker appId={app.id} initialPinned={pinnedCountries} />}

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold">Ranking history</h2>
        <RankHistoryChart appId={app.id} pinnedCountries={pinnedCountries} />
      </section>

      {countryRanks.length > 0 && (
        <section className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Top ranking theo nước</h2>
            <p className="text-xs text-muted-foreground">
              Thứ hạng mới nhất (top 200). Nước đã pin được đánh dấu.
            </p>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Country</th>
                  <th className="px-4 py-2 text-right">Top Free</th>
                  <th className="px-4 py-2 text-right">Top Paid</th>
                  <th className="px-4 py-2 text-right">Best</th>
                </tr>
              </thead>
              <tbody>
                {countryRanks.map((r) => (
                  <tr
                    key={r.code}
                    className={
                      pinnedCountries.includes(r.code) ? "bg-accent/40" : undefined
                    }
                  >
                    <td className="px-4 py-2 font-medium uppercase">
                      {r.code}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {countryName(r.code)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{r.free ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{r.paid ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{r.best ?? "—"}</td>
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