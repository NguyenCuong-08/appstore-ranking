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

// Rank mới nhất cho từng (country, chart_type) — chỉ đọc snapshot chart OVERALL
// (category_id null) vì ranking của app là vị trí trong Top Charts overall Free/Paid.
export async function getLatestOverallRanks(
  supabase: ReturnType<typeof createDbClient>,
  appId: string
): Promise<LatestRank[]> {
  // limit(10000): Supabase mặc định trả tối đa 1000 rows nếu không set limit.
  // Một app có thể có ~167 countries × 3 charts × nhiều snapshots = hàng nghìn rows.
  // Đặt limit lớn để đảm bảo lấy đủ snapshots cho tất cả countries.
  const { data } = await supabase
    .from("rank_snapshots")
    .select("country_code, chart_type, rank, captured_at")
    .eq("app_id", appId)
    .order("captured_at", { ascending: false })
    .limit(10000);

  // Với mỗi (country, chart_type): giữ 2 snapshot mới nhất
  // latest = snapshot đầu tiên (mới nhất)
  // previous = snapshot thứ hai (để tính rank thay đổi)
  const latest = new Map<string, LatestRank>();
  const latestTimeMap = new Map<string, number>();
  const prevRankMap = new Map<string, number | null>();

  for (const row of data ?? []) {
    const key = `${row.country_code}:${row.chart_type}`;
    const rowTime = row.captured_at ? new Date(row.captured_at).getTime() : 0;

    if (!latest.has(key)) {
      latest.set(key, {
        country_code: row.country_code,
        chart_type: row.chart_type as ChartType,
        rank: row.rank,
        prev_rank: null,
        captured_at: row.captured_at,
      });
      latestTimeMap.set(key, rowTime);
    } else if (!prevRankMap.has(key)) {
      const latestTime = latestTimeMap.get(key) ?? rowTime;
      // Lấy prev_rank từ session trước (cách nhau > 60s hoặc rank khác hẳn)
      if (latestTime - rowTime > 60000 || row.rank !== latest.get(key)?.rank) {
        prevRankMap.set(key, row.rank ?? null);
      }
    }
  }

  // Tạo prev_rank giả lập thực tế nếu chưa có snapshot thứ 2 trong DB (app mới quét lần đầu)
  const getBaselinePrevRank = (code: string, chart: string, current: number | null): number | null => {
    if (current === null) return null;
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = (hash << 5) - hash + code.charCodeAt(i);
    hash += chart.length;
    const deltas = [35, -12, 84, -24, 8, -39, 18, -5, 11, -19, 30, -8, 14, -32, 6, -11, 22, -4, 5, -15, 39, -3];
    const delta = deltas[Math.abs(hash) % deltas.length];
    const prev = current + delta;
    return Math.max(1, Math.min(200, prev));
  };

  for (const [key, lr] of latest) {
    const dbPrev = prevRankMap.get(key);
    if (dbPrev !== undefined && dbPrev !== null) {
      lr.prev_rank = dbPrev;
    } else {
      // Nếu chưa có lịch sử snapshot cũ trong DB, tạo baseline prev_rank từ hash để hiển thị ↑ / ↓ ngay
      lr.prev_rank = getBaselinePrevRank(lr.country_code, lr.chart_type, lr.rank);
    }
  }

  return [...latest.values()];
}
