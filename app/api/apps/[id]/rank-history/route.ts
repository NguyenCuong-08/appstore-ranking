import { NextRequest, NextResponse } from "next/server";
import { createDbClient } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

interface HistoryRow {
  captured_at: string;
  rank: number | null;
  country_code: string;
  chart_type: string;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const params = request.nextUrl.searchParams;
  const country = params.get("country") || "";
  const chart = params.get("chart") || "";
  const days = Math.min(Math.max(Number(params.get("days")) || 30, 1), 365);

  const supabase = createDbClient();
  let query = supabase
    .from("rank_snapshots")
    .select("captured_at, rank, country_code, chart_type, category_id")
    .eq("app_id", id)
    .gte("captured_at", new Date(Date.now() - days * 86400000).toISOString())
    .order("captured_at", { ascending: true });

  if (country) query = query.eq("country_code", country);
  if (chart) query = query.eq("chart_type", chart);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Failed to load history", detail: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as Array<HistoryRow & { category_id: number | null }>;

  // Gộp theo (ngày, country, chart): giữ best rank (thấp nhất) trong ngày cho mỗi
  // chart, xét trên cả rank overall + primary category — tránh trùng lặp cùng ngày,
  // hiển thị đúng xu hướng rank của app tại nước đó.
  const byKey = new Map<string, HistoryRow>();
  for (const r of rows) {
    const date = r.captured_at.slice(0, 10);
    const key = `${date}:${r.country_code}:${r.chart_type}`;
    const existing = byKey.get(key);
    if (!existing || (r.rank !== null && (existing.rank === null || (r.rank as number) < (existing.rank as number)))) {
      byKey.set(key, {
        captured_at: r.captured_at,
        rank: r.rank,
        country_code: r.country_code,
        chart_type: r.chart_type,
      });
    }
  }

  return NextResponse.json({ data: [...byKey.values()] });
}
