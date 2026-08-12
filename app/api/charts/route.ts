import { NextRequest, NextResponse } from "next/server";
import { fetchTopCharts } from "@/lib/apple";
import { resolveGenreId, CHART_LABELS } from "@/lib/constants";
import type { ChartType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const country = params.get("country") || "us";
  const category = params.get("category") || "all";
  const chart = (params.get("chart") || "top-free") as ChartType;
  const limit = Math.min(Number(params.get("limit")) || 100, 100);

  if (!CHART_LABELS[chart]) {
    return NextResponse.json({ error: "Invalid chart type" }, { status: 400 });
  }

  const genreId = resolveGenreId(category);

  try {
    const apps = await fetchTopCharts({ country, chart, genreId, limit });
    return NextResponse.json({
      country,
      category,
      chart,
      limit,
      genreId: genreId ?? null,
      apps,
      source: "rss",
      updatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch Apple charts",
        detail: (err as Error).message,
      },
      { status: 502 }
    );
  }
}
