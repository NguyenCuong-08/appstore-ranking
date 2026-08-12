import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createDbClient, getLatestOverallRanks } from "@/lib/supabase/db";
import { lookupApp, discoverRanksAcrossCountries } from "@/lib/apple";
import type { LatestRank } from "@/lib/types";
import { ToplifyAppDetail } from "@/components/toplify-app-detail";
import { countryName } from "@/lib/constants";

export const metadata: Metadata = {
  title: "App Details — Toplify Web",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ appleId: string }>;
}

// Toplify Score (0-100): điểm bình quân theo best rank mỗi quốc gia.
// Điểm = (100 - bestRank), rank 1 → 99 điểm, rank 100 → 0 điểm. Không tính top-grossing.
function rankingScore(ranks: LatestRank[]): number | null {
  const ranked = ranks.filter(
    (r) => r.chart_type !== "top-grossing" && r.rank !== null && r.rank !== undefined
  );
  if (ranked.length === 0) return null;

  const byCountry = new Map<string, number>();
  for (const r of ranked) {
    const cur = byCountry.get(r.country_code);
    if (cur === undefined || (r.rank as number) < cur) {
      byCountry.set(r.country_code, r.rank as number);
    }
  }

  let sum = 0;
  for (const bestRank of byCountry.values()) {
    sum += Math.max(0, 100 - bestRank);
  }
  return Math.round((sum / byCountry.size) * 10) / 10;
}

export default async function AppDetailPage({ params }: PageProps) {
  const { appleId } = await params;
  const supabase = createDbClient();

  // 1. Fetch app record from DB
  let { data: app } = await supabase
    .from("apps")
    .select("*")
    .eq("apple_id", appleId)
    .maybeSingle();

  // 2. Auto-enrich missing or nullable app metadata from App Store API
  const needsEnrichment =
    !app ||
    app.rating === null ||
    app.rating_count === null ||
    app.rating_count === 0 ||
    !app.developer ||
    !app.icon_url ||
    !app.last_metadata_sync_at;

  if (needsEnrichment) {
    try {
      const lookup = await lookupApp(appleId);
      if (lookup) {
        const payload = {
          apple_id: String(lookup.trackId),
          bundle_id: lookup.bundleId || app?.bundle_id || null,
          name: lookup.trackName || app?.name || "App",
          developer: lookup.artistName || app?.developer || null,
          icon_url: lookup.artworkUrl100 || app?.icon_url || null,
          primary_category_id: lookup.primaryGenreId || app?.primary_category_id || null,
          price: lookup.price ?? app?.price ?? 0,
          rating: lookup.averageUserRating ?? app?.rating ?? null,
          rating_count: lookup.userRatingCount || app?.rating_count || 0,
          last_metadata_sync_at: new Date().toISOString(),
        };

        const { data: upserted } = await supabase
          .from("apps")
          .upsert(payload, { onConflict: "apple_id" })
          .select()
          .single();

        if (upserted) {
          app = upserted;
        }
      }
    } catch (err) {
      console.error("Metadata lookup error:", err);
    }
  }

  if (!app) {
    notFound();
  }

  // 3. Fetch tracked status & pinned countries
  const { data: ta } = await supabase
    .from("tracked_apps")
    .select("pinned_countries")
    .eq("app_id", app.id)
    .maybeSingle();

  const tracking = Boolean(ta);
  const pinnedCountries: string[] = ta?.pinned_countries ?? [];

  // 4. Fetch latest ranks from rank_snapshots (chỉ chart overall)
  let ranks = await getLatestOverallRanks(supabase, app.id);

  // 5. Live ranking discovery across ALL countries × [top-free, top-paid] overall
  const latestCaptured = ranks.reduce(
    (max, r) => (r.captured_at ? Math.max(max, new Date(r.captured_at).getTime()) : max),
    0
  );
  const STALE_MS = 6 * 3600 * 1000; // 6h
  const needsDiscovery = ranks.length === 0 || Date.now() - latestCaptured > STALE_MS;

  if (needsDiscovery) {
    const discovered = await discoverRanksAcrossCountries({
      appleId: app.apple_id,
    });

    if (discovered.length > 0) {
      const snapshotsToInsert = discovered.map((d) => ({
        app_id: app.id,
        country_code: d.country_code,
        category_id: null,
        chart_type: d.chart_type,
        rank: d.rank,
      }));

      for (let i = 0; i < snapshotsToInsert.length; i += 500) {
        await supabase.from("rank_snapshots").insert(snapshotsToInsert.slice(i, i + 500));
      }
    }

    // Re-query ranks from database
    ranks = await getLatestOverallRanks(supabase, app.id);
  }

  const score = rankingScore(ranks);
  const rankedRows = ranks.filter(
    (r) => r.rank !== null && r.rank !== undefined
  );
  const countriesInTop = new Set(
    rankedRows.filter((r) => (r.rank as number) <= 200).map((r) => r.country_code)
  ).size;

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
    .sort(
      (a, b) =>
        (a.best ?? 999) - (b.best ?? 999) ||
        countryName(a.code).localeCompare(countryName(b.code))
    );

  return (
    <ToplifyAppDetail
      app={{
        id: app.id,
        apple_id: app.apple_id,
        name: app.name,
        developer: app.developer,
        icon_url: app.icon_url,
        price: app.price,
        rating: app.rating,
        rating_count: app.rating_count,
      }}
      tracking={tracking}
      pinnedCountries={pinnedCountries}
      countryRanks={countryRanks}
      score={score}
      countriesInTop={countriesInTop}
    />
  );
}
