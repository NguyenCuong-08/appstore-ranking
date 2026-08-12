import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { ChartType, LatestRank } from "@/lib/types";

export function createDbClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Rank mới nhất cho từng (country, chart_type) — chỉ đọc snapshot chart OVERALL
// (category_id null) vì ranking của app là vị trí trong Top Charts overall Free/Paid.
export async function getLatestOverallRanks(
  supabase: ReturnType<typeof createDbClient>,
  appId: string
): Promise<LatestRank[]> {
  const { data } = await supabase
    .from("rank_snapshots")
    .select("country_code, chart_type, rank, captured_at")
    .eq("app_id", appId)
    .is("category_id", null)
    .order("captured_at", { ascending: false });

  const latest = new Map<string, LatestRank>();
  for (const row of data ?? []) {
    const key = `${row.country_code}:${row.chart_type}`;
    if (!latest.has(key)) {
      latest.set(key, {
        country_code: row.country_code,
        chart_type: row.chart_type as ChartType,
        rank: row.rank,
        captured_at: row.captured_at,
      });
    }
  }
  return [...latest.values()];
}
