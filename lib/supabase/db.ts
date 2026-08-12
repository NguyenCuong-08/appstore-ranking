import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { ChartType, LatestRank } from "@/lib/types";

export function createDbClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

// Rank mới nhất cho từng (country, chart_type) — gồm cả rank OVERALL (category_id null)
// và rank trong chart primary category. Với mỗi (country, chart) lấy rank TỐT NHẤT
// (thấp nhất) trong tất cả snapshot gần nhất — như vậy app có rank trong category
// (vd TikTok trong Entertainment) vẫn được đếm đủ country.
export async function getLatestOverallRanks(
  supabase: ReturnType<typeof createDbClient>,
  appId: string
): Promise<LatestRank[]> {
  // limit(30000): Supabase mặc định trả tối đa 1000 rows nếu không set limit.
  // Một app có thể có ~175 countries × 2 charts × (overall + category) × nhiều snapshots.
  // Đặt limit lớn để đảm bảo lấy đủ snapshots cho tất cả countries/charts/categories.
  const { data } = await supabase
    .from("rank_snapshots")
    .select("country_code, chart_type, category_id, rank, captured_at")
    .eq("app_id", appId)
    .order("captured_at", { ascending: false })
    .limit(30000);

  // Với mỗi (country, chart_type, category_id): giữ 2 snapshot mới nhất
  // latest = snapshot đầu tiên (mới nhất)
  // previous = snapshot thứ hai (để tính rank thay đổi thật từ dữ liệu, KHÔNG fake)
  type RawRow = {
    country_code: string;
    chart_type: string;
    category_id: number | null;
    rank: number | null;
    captured_at: string | null;
  };
  const latest = new Map<string, { row: RawRow; time: number }>();
  const prevRankMap = new Map<string, number | null>();

  for (const row of (data ?? []) as RawRow[]) {
    const key = `${row.country_code}:${row.chart_type}:${row.category_id ?? "overall"}`;
    const rowTime = row.captured_at ? new Date(row.captured_at).getTime() : 0;

    if (!latest.has(key)) {
      latest.set(key, { row, time: rowTime });
    } else if (!prevRankMap.has(key)) {
      const latestTime = latest.get(key)!.time;
      // Lấy prev_rank từ session trước thật (cách nhau > 60s hoặc rank khác hẳn)
      if (
        latestTime - rowTime > 60000 ||
        row.rank !== latest.get(key)!.row.rank
      ) {
        prevRankMap.set(key, row.rank ?? null);
      }
    }
  }

  // Gộp theo (country, chart_type): chọn entry có rank tốt nhất (thấp nhất)
  // trong các category để đếm đủ country — ưu tiên snapshot gần nhất khi rank bằng nhau.
  const best = new Map<
    string,
    {
      row: RawRow;
      time: number;
      prev_rank: number | null;
    }
  >();
  for (const [key, v] of latest) {
    const [country, chart] = key.split(":");
    const ckey = `${country}:${chart}`;
    const curRank = v.row.rank ?? Infinity;
    const existing = best.get(ckey);
    const existingRank = existing?.row.rank ?? Infinity;

    if (
      !existing ||
      curRank < existingRank ||
      (curRank === existingRank && v.time > existing.time)
    ) {
      best.set(ckey, {
        row: v.row,
        time: v.time,
        prev_rank: prevRankMap.get(key) ?? null,
      });
    }
  }

  return [...best.values()].map(({ row, prev_rank }) => ({
    country_code: row.country_code,
    chart_type: row.chart_type as ChartType,
    rank: row.rank,
    prev_rank,
    captured_at: row.captured_at,
  }));
}
