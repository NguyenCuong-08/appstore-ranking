import { NextRequest, NextResponse } from "next/server";
import { createDbClient } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const params = request.nextUrl.searchParams;
  const country = params.get("country") || "";
  const chart = params.get("chart") || "";
  const days = Math.min(Math.max(Number(params.get("days")) || 30, 1), 365);

  const supabase = createDbClient();
  let query = supabase
    .from("rank_snapshots")
    .select("captured_at, rank, country_code, chart_type")
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

  return NextResponse.json({ data: data ?? [] });
}
