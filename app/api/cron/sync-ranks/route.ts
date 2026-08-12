import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { fetchOverallChart } from "@/lib/apple";
import { SCAN_COUNTRY_CODES } from "@/lib/constants";
import type { ChartType } from "@/lib/types";

export const dynamic = "force-dynamic";

const CHART_TYPES: ChartType[] = ["top-free", "top-paid"];
const DEDUP_WINDOW_MINUTES = 50;

function authorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function checkAlertsForCombo(
  supabase: ReturnType<typeof createServiceRoleClient>,
  appIds: string[],
  countryCode: string,
  chartType: ChartType
) {
  if (appIds.length === 0) return 0;

  const { data: alerts, error } = await supabase
    .from("rank_alerts")
    .select("*")
    .eq("country_code", countryCode)
    .eq("chart_type", chartType)
    .eq("active", true)
    .in("app_id", appIds);

  if (error) throw error;
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

    if (
      rank !== null &&
      rank !== undefined &&
      rank <= alert.threshold_rank &&
      cooldownOk
    ) {
      console.log(
        `[ALERT] app=${alert.app_id} country=${countryCode} chart=${chartType} rank=${rank} threshold=${alert.threshold_rank}`
      );
      await supabase
        .from("rank_alerts")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", alert.id);
      triggered++;
    }
  }
  return triggered;
}

const CONCURRENCY = 10;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // All tracked apps
  const { data: trackedRows } = await supabase.from("tracked_apps").select("app_id");
  const trackedAppIds = [...new Set((trackedRows ?? []).map((r) => r.app_id))];
  if (trackedAppIds.length === 0) {
    return NextResponse.json({ ok: true, combosProcessed: 0, snapshotsInserted: 0, alertsTriggered: 0, errors: [] });
  }

  const { data: appRows } = await supabase
    .from("apps")
    .select("id, apple_id")
    .in("id", trackedAppIds);
  const apps = appRows ?? [];
  const appleIdToUuid = new Map(apps.map((a) => [String(a.apple_id), a.id]));
  const allAppIds = apps.map((a) => a.id);
  if (allAppIds.length === 0) {
    return NextResponse.json({ ok: true, combosProcessed: 0, snapshotsInserted: 0, alertsTriggered: 0, errors: [] });
  }

  let combosProcessed = 0;
  let snapshotsInserted = 0;
  let alertsTriggered = 0;
  const errors: string[] = [];

  for (const chartType of CHART_TYPES) {
    // Countries chưa được sync overall chart này trong DEDUP_WINDOW
    const { data: recentRows } = await supabase
      .from("rank_snapshots")
      .select("country_code, captured_at")
      .eq("chart_type", chartType)
      .is("category_id", null)
      .not("country_code", "is", null)
      .gte("captured_at", new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60000).toISOString());

    const syncCutoff = new Set((recentRows ?? []).map((r) => r.country_code));
    const countriesToSync = SCAN_COUNTRY_CODES.filter((c) => !syncCutoff.has(c));

    if (countriesToSync.length === 0) {
      combosProcessed += SCAN_COUNTRY_CODES.length;
      continue;
    }

    // Fetch overall chart (top-free/top-paid, limit 100) cho tất cả nước song song
    const charts = await mapWithConcurrency(countriesToSync, CONCURRENCY, async (countryCode) => {
      try {
        const chart = await fetchOverallChart(countryCode, chartType, 100);
        const rankByAppleId = new Map<string, number>();
        for (const entry of chart) {
          rankByAppleId.set(String(entry.id), entry.rank);
        }
        return { countryCode, rankByAppleId };
      } catch (err) {
        errors.push(`sync ${countryCode}-${chartType}: ${(err as Error).message}`);
        return null;
      }
    });

    // Query last rank per app cho các nước này (để dedup: chỉ insert khi rank đổi)
    const { data: lastRows } = await supabase
      .from("rank_snapshots")
      .select("app_id, country_code, rank")
      .eq("chart_type", chartType)
      .is("category_id", null)
      .in("country_code", countriesToSync)
      .order("captured_at", { ascending: false });

    const lastRankKey = new Map<string, number | null>();
    for (const row of lastRows ?? []) {
      const key = `${row.app_id}:${row.country_code}`;
      if (!lastRankKey.has(key)) lastRankKey.set(key, row.rank ?? null);
    }

    for (const result of charts) {
      if (!result) continue;
      const { countryCode, rankByAppleId } = result;

      const rows: Array<{
        app_id: string;
        country_code: string;
        category_id: null;
        chart_type: ChartType;
        rank: number | null;
      }> = [];
      for (const [appleId, uuid] of appleIdToUuid) {
        const newRank = rankByAppleId.get(appleId) ?? null;
        const key = `${uuid}:${countryCode}`;
        if (lastRankKey.has(key) && lastRankKey.get(key) === newRank) continue;
        rows.push({
          app_id: uuid,
          country_code: countryCode,
          category_id: null,
          chart_type: chartType,
          rank: newRank,
        });
      }

      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase
            .from("rank_snapshots")
            .insert(rows.slice(i, i + 500));
          if (error) throw error;
        }
        snapshotsInserted += rows.length;
        alertsTriggered += await checkAlertsForCombo(supabase, allAppIds, countryCode, chartType);
      }
      combosProcessed++;
    }
  }

  return NextResponse.json({
    ok: true,
    combosProcessed,
    snapshotsInserted,
    alertsTriggered,
    errors,
  });
}
