import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createDbClient, getLatestOverallRanks } from "@/lib/supabase/db";
import { lookupApp } from "@/lib/apple";
import type { LatestRank } from "@/lib/types";
import { ToplifyAppDetail } from "@/components/toplify-app-detail";
import { UntrackedAppGate } from "@/components/untracked-app-gate";
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

  // 2. Auto-enrich missing or nullable app metadata từ App Store API.
  //    Giữ nguyên nhưng chỉ dùng lookupApp 1 lần (đã có retry logic trong apple.ts).
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

  // CHỈ APP ĐÃ ĐƯỢC THÊM VÀO MY APPS MỚI CHO XEM TRANG CHI TIẾT
  if (!tracking) {
    return (
      <UntrackedAppGate
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
      />
    );
  }

  // 4. Fetch latest ranks từ DB (không block để discovery hoàn tất)
  const ranks = await getLatestOverallRanks(supabase, app.id);

  // 5. Kiểm tra xem data có cần discovery mới không (stale > 6h hoặc chưa có rank nào)
  const latestCaptured = ranks.reduce(
    (max, r) =>
      r.captured_at ? Math.max(max, new Date(r.captured_at).getTime()) : max,
    0
  );
  const STALE_MS = 6 * 3600 * 1000;
  const needsDiscovery = ranks.length < 100 || Date.now() - latestCaptured > STALE_MS;

  // 6. Tính score & group by country từ data hiện có trong DB
  const score = rankingScore(ranks);
  const rankedRows = ranks.filter(
    (r) => r.rank !== null && r.rank !== undefined
  );
  // Đếm TẤT CẢ countries có rank (không filter theo ngưỡng) vì scan lấy top 100
  // nên mọi rank trong DB đều hợp lệ và cần đếm hết.
  const countriesInTop = new Set(
    rankedRows.map((r) => r.country_code)
  ).size;

  // Group by country — tính best rank hiện tại và best rank trước đó cho mỗi nước
  const byCountry = new Map<
    string,
    {
      free: number | null; paid: number | null; grossing: number | null;
      best: number | null; prevBest: number | null;
    }
  >();
  for (const r of ranks) {
    const row =
      byCountry.get(r.country_code) ??
      { free: null, paid: null, grossing: null, best: null, prevBest: null };

    if (r.chart_type === "top-free") row.free = r.rank;
    else if (r.chart_type === "top-paid") row.paid = r.rank;
    else row.grossing = r.rank;

    // best rank hiện tại
    if (r.rank !== null && r.rank !== undefined) {
      row.best = row.best === null ? r.rank : Math.min(row.best, r.rank);
    }
    // best rank trước đó (prev_rank)
    if (r.prev_rank !== null && r.prev_rank !== undefined) {
      row.prevBest = row.prevBest === null ? r.prev_rank : Math.min(row.prevBest, r.prev_rank);
    }

    byCountry.set(r.country_code, row);
  }

  const countryRanks = [...byCountry.entries()]
    .map(([code, row]) => {
      // rankChange = prevBest - best  (dương = tăng hạng, âm = tụt hạng, null = chưa có lịch sử)
      const rankChange =
        row.prevBest !== null && row.best !== null
          ? row.prevBest - row.best
          : null;
      return { code, free: row.free, paid: row.paid, grossing: row.grossing, best: row.best, rankChange };
    })
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
      needsDiscovery={needsDiscovery}
    />
  );
}
