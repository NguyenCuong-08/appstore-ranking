import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { fetchTopCharts } from "@/lib/apple";
import type { ChartType } from "@/lib/types";

export const dynamic = "force-dynamic";

const CHART_TYPES: ChartType[] = ["top-free", "top-paid"];
const DEDUP_WINDOW_MINUTES = 50;

function authorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function getTrackedAppsInCategory(
  supabase: ReturnType<typeof createServiceRoleClient>,
  trackedAppIds: string[],
  categoryId: number
): Promise<Array<{ id: string; apple_id: string }>> {
  if (trackedAppIds.length === 0) return [];
  const { data, error } = await supabase
    .from("apps")
    .select("id, apple_id")
    .eq("primary_category_id", categoryId)
    .in("id", trackedAppIds);
  if (error) throw error;
  return data ?? [];
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

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: combos, error: comboErr } = await supabase.rpc(
    "get_needed_chart_combos"
  );
  if (comboErr) {
    return NextResponse.json(
      { error: "Failed to load combos", detail: comboErr.message },
      { status: 500 }
    );
  }

  const { data: trackedRows } = await supabase.from("tracked_apps").select("app_id");
  const trackedAppIds = [...new Set((trackedRows ?? []).map((r) => r.app_id))];

  let combosProcessed = 0;
  let snapshotsInserted = 0;
  let alertsTriggered = 0;
  const errors: string[] = [];

  for (const combo of combos ?? []) {
    for (const chartType of CHART_TYPES) {
      try {
        const { data: last } = await supabase
          .from("rank_snapshots")
          .select("captured_at")
          .eq("country_code", combo.country_code)
          .eq("category_id", combo.category_id)
          .eq("chart_type", chartType)
          .order("captured_at", { ascending: false })
          .limit(1);

        if (last && last.length > 0) {
          const ageMinutes =
            (Date.now() - new Date(last[0].captured_at).getTime()) / 60000;
          if (ageMinutes < DEDUP_WINDOW_MINUTES) continue;
        }

        const apps = await getTrackedAppsInCategory(
          supabase,
          trackedAppIds,
          combo.category_id
        );
        if (apps.length === 0) continue;

        const chart = await fetchTopCharts({
          country: combo.country_code,
          chart: chartType,
          genreId: combo.category_id,
          limit: 200,
        });
        const rankByAppleId = new Map<string, number>();
        for (const entry of chart) {
          rankByAppleId.set(String(entry.id), entry.rank);
        }

        // Lấy rank gần nhất của combo này để chỉ insert khi rank thay đổi
        const { data: lastRows } = await supabase
          .from("rank_snapshots")
          .select("app_id, rank")
          .eq("country_code", combo.country_code)
          .eq("category_id", combo.category_id)
          .eq("chart_type", chartType)
          .order("captured_at", { ascending: false });

        const lastRankByApp = new Map<string, number | null>();
        for (const row of lastRows ?? []) {
          if (!lastRankByApp.has(row.app_id)) {
            lastRankByApp.set(row.app_id, row.rank ?? null);
          }
        }

        const rows = apps
          .map((app) => {
            const newRank = rankByAppleId.get(app.apple_id) ?? null;
            if (lastRankByApp.has(app.id)) {
              if (lastRankByApp.get(app.id) === newRank) return null;
            }
            return {
              app_id: app.id,
              country_code: combo.country_code,
              category_id: combo.category_id,
              chart_type: chartType,
              rank: newRank,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 500) {
            const { error } = await supabase
              .from("rank_snapshots")
              .insert(rows.slice(i, i + 500));
            if (error) throw error;
          }
          snapshotsInserted += rows.length;

          alertsTriggered += await checkAlertsForCombo(
            supabase,
            apps.map((a) => a.id),
            combo.country_code,
            chartType
          );
        }
        combosProcessed++;
      } catch (err) {
        errors.push(
          `${combo.country_code}-${combo.category_id}-${chartType}: ${(err as Error).message}`
        );
      }
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
