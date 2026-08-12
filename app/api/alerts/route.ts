import { NextRequest, NextResponse } from "next/server";
import { createDbClient } from "@/lib/supabase/db";
import { CHARTS, COUNTRY_CODES } from "@/lib/constants";
import type { ChartType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createDbClient();

  const appId = request.nextUrl.searchParams.get("appId");
  let query = supabase
    .from("rank_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (appId) query = query.eq("app_id", appId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Failed to load alerts", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createDbClient();

  let body: {
    app_id?: string;
    country_code?: string;
    chart_type?: string;
    threshold_rank?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { app_id, country_code, chart_type, threshold_rank } = body;

  if (
    !app_id ||
    !country_code ||
    !chart_type ||
    !COUNTRY_CODES.includes(country_code) ||
    !CHARTS.includes(chart_type as ChartType) ||
    !Number.isInteger(threshold_rank) ||
    (threshold_rank as number) < 1
  ) {
    return NextResponse.json({ error: "Invalid alert parameters" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rank_alerts")
    .insert({
      app_id,
      country_code,
      chart_type,
      threshold_rank,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create alert", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ data }, { status: 201 });
}
