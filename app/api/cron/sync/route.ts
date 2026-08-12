import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { lookupApps, discoverRanksAcrossCountries } from "@/lib/apple";
import { SCAN_COUNTRY_CODES } from "@/lib/constants";
import type { ChartType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function authorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Alert check ──────────────────────────────────────────────────────────────
async function checkAlerts(
  supabase: ReturnType<typeof createServiceRoleClient>,
  allAppIds: string[],
  countryCode: string,
  chartType: ChartType
) {
  if (allAppIds.length === 0) return 0;
  const { data: alerts } = await supabase
    .from("rank_alerts")
    .select("*")
    .eq("country_code", countryCode)
    .eq("chart_type", chartType)
    .eq("active", true)
    .in("app_id", allAppIds);

  if (!alerts || alerts.length === 0) return 0;
  let triggered = 0;

  for (const alert of alerts) {
    const { data: snap } = await supabase
      .from("rank_snapshots")
      .select("rank")
      .eq("app_id", alert.app_id)
      .eq("country_code", countryCode)
      .eq("chart_type", chartType)
      .is("category_id", null)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rank = snap?.rank;
    const cooldownOk =
      !alert.last_triggered_at ||
      Date.now() - new Date(alert.last_triggered_at).getTime() > 24 * 3600000;

    if (rank != null && rank <= alert.threshold_rank && cooldownOk) {
      await supabase
        .from("rank_alerts")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);
      triggered++;
      console.log(`[sync] ALERT triggered: app=${alert.app_id} ${countryCode}/${chartType} rank=${rank}`);
    }
  }
  return triggered;
}

// ─── Main cron handler ────────────────────────────────────────────────────────
/**
 * GET /api/cron/sync
 * Cron duy nhất — chạy mỗi 6 tiếng, cập nhật toàn bộ cho TẤT CẢ tracked apps:
 *
 * Bước 1: Metadata (name, developer, icon, rating, price…)
 * Bước 2: Rank discovery toàn bộ ~160 nước × 2 charts (top-free, top-paid)
 * Bước 3: Kiểm tra rank alerts
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // ── Lấy danh sách tracked apps ──────────────────────────────────────────────
  const { data: trackedRows, error: trackErr } = await supabase
    .from("tracked_apps")
    .select("app_id");

  if (trackErr) {
    return NextResponse.json({ error: trackErr.message }, { status: 500 });
  }

  const trackedIds = [...new Set((trackedRows ?? []).map((r) => r.app_id))];
  if (trackedIds.length === 0) {
    return NextResponse.json({ ok: true, message: "No tracked apps" });
  }

  const { data: appRows } = await supabase
    .from("apps")
    .select("id, apple_id, primary_category_id")
    .in("id", trackedIds);

  const apps = appRows ?? [];
  const allAppIds = apps.map((a) => a.id);
  const appleIds = apps.map((a) => a.apple_id);

  if (apps.length === 0) {
    return NextResponse.json({ ok: true, message: "No apps found" });
  }

  const stats = {
    metadata_updated: 0,
    ranks_inserted: 0,
    alerts_triggered: 0,
    errors: [] as string[],
  };

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: Cập nhật metadata (name, developer, icon_url, rating, price…)
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`[sync] Step 1: Metadata for ${apps.length} apps`);
  try {
    const lookupResults = await lookupApps(appleIds, "us");
    const byAppleId = new Map(lookupResults.map((r) => [String(r.trackId), r]));

    for (const app of apps) {
      const meta = byAppleId.get(app.apple_id);
      if (!meta) continue;

      const { error } = await supabase
        .from("apps")
        .update({
          name: meta.trackName,
          developer: meta.artistName,
          icon_url: meta.artworkUrl100,
          primary_category_id: meta.primaryGenreId ?? null,
          price: meta.price ?? 0,
          rating: meta.averageUserRating ?? null,
          rating_count: meta.userRatingCount ?? 0,
          bundle_id: meta.bundleId ?? null,
          last_metadata_sync_at: now,
        })
        .eq("id", app.id);

      if (error) {
        stats.errors.push(`metadata ${app.apple_id}: ${error.message}`);
      } else {
        stats.metadata_updated++;
      }

      await sleep(80);
    }
  } catch (err) {
    stats.errors.push(`metadata batch: ${(err as Error).message}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2: Rank discovery toàn bộ ~160 nước cho từng app (Overall + Category)
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`[sync] Step 2: Rank discovery for ${apps.length} apps × ${SCAN_COUNTRY_CODES.length} countries`);

  for (const app of apps) {
    try {
      const discovered = await discoverRanksAcrossCountries({
        appleId: app.apple_id,
        genreId: app.primary_category_id,
        countries: SCAN_COUNTRY_CODES,
        concurrency: 8,
      });

      if (discovered.length > 0) {
        const snapshots = discovered.map((d) => ({
          app_id: app.id,
          country_code: d.country_code,
          category_id: d.category_id ?? null,
          chart_type: d.chart_type as ChartType,
          rank: d.rank,
        }));

        for (let i = 0; i < snapshots.length; i += 500) {
          const { error } = await supabase
            .from("rank_snapshots")
            .insert(snapshots.slice(i, i + 500));
          if (error) {
            stats.errors.push(`snapshots ${app.apple_id}: ${error.message}`);
          }
        }

        stats.ranks_inserted += discovered.length;

        // ── Bước 3: Kiểm tra alerts cho app này ────────────────────────────
        const countriesFound = [...new Set(discovered.map((d) => d.country_code))];
        for (const country of countriesFound) {
          for (const chart of ["top-free", "top-paid"] as ChartType[]) {
            stats.alerts_triggered += await checkAlerts(supabase, allAppIds, country, chart);
          }
        }
      }

      console.log(`[sync] ${app.apple_id}: metadata ✓, ${discovered.length} ranks found`);
    } catch (err) {
      stats.errors.push(`discovery ${app.apple_id}: ${(err as Error).message}`);
    }

    // Delay giữa các app để tránh Apple throttle
    if (apps.indexOf(app) < apps.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`[sync] Done — metadata:${stats.metadata_updated} ranks:${stats.ranks_inserted} alerts:${stats.alerts_triggered} errors:${stats.errors.length}`);

  return NextResponse.json({ ok: true, ...stats });
}
