import { NextRequest, NextResponse } from "next/server";
import { createDbClient, getLatestOverallRanks } from "@/lib/supabase/db";
import { discoverRanksAcrossCountries } from "@/lib/apple";
import { PRIORITY_SCAN_COUNTRIES, SCAN_COUNTRY_CODES } from "@/lib/constants";

export const dynamic = "force-dynamic";
// Cho phép request chạy lâu hơn (Vercel: tối đa 60s trên Hobby, 300s Pro)
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/apps/[id]/discover
 * Chạy rank discovery cho app (bằng apple_id, không phải DB id).
 * Body: { apple_id: string, force?: boolean, full?: boolean }
 *
 * - Nếu data đã fresh (< 6h) và force !== true → trả về ngay, không quét lại.
 * - full=false (default): quét PRIORITY_SCAN_COUNTRIES (24 nước) — nhanh, dùng khi load trang.
 * - full=true: quét SCAN_COUNTRY_CODES (~160 nước) — đầy đủ, dùng khi cần sync toàn bộ.
 * - Lưu kết quả vào rank_snapshots.
 * - Trả về số rank mới tìm thấy.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createDbClient();

  let body: { apple_id?: string; force?: boolean; full?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // body optional
  }

  const { apple_id, force = false } = body;

  if (!apple_id) {
    return NextResponse.json({ error: "apple_id required" }, { status: 400 });
  }

  // Check staleness: nếu đã quét đủ > 50 countries và data còn fresh (< 6h) và không force → skip
  const STALE_MS = 6 * 3600 * 1000;
  const currentRanks = await getLatestOverallRanks(supabase, id);
  const countryCount = new Set(currentRanks.map((r) => r.country_code)).size;
  const latestCaptured = currentRanks.reduce(
    (max, r) =>
      r.captured_at ? Math.max(max, new Date(r.captured_at).getTime()) : max,
    0
  );
  const isFresh = countryCount >= 50 && Date.now() - latestCaptured < STALE_MS;

  if (isFresh && !force) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "Data is fresh, skipped discovery",
      rank_count: currentRanks.length,
      country_count: countryCount,
    });
  }

  // Lấy primary_category_id của app từ DB
  const { data: appRow } = await supabase
    .from("apps")
    .select("primary_category_id")
    .eq("id", id)
    .maybeSingle();
  const genreId = appRow?.primary_category_id ?? null;

  // Quét toàn bộ ~160 nước (SCAN_COUNTRY_CODES) với concurrency = 30 (chạy trong ~1-2s)
  let discovered: Awaited<ReturnType<typeof discoverRanksAcrossCountries>> = [];
  try {
    discovered = await discoverRanksAcrossCountries({
      appleId: apple_id,
      genreId,
      countries: SCAN_COUNTRY_CODES,
      concurrency: 30,
    });
  } catch (err) {
    console.error("[discover] Full scan error:", err);
  }

  // Lưu kết quả vào DB
  if (discovered.length > 0) {
    const snapshotsToInsert = discovered.map((d) => ({
      app_id: id,
      country_code: d.country_code,
      category_id: d.category_id ?? null,
      chart_type: d.chart_type,
      rank: d.rank,
    }));
    for (let i = 0; i < snapshotsToInsert.length; i += 500) {
      await supabase.from("rank_snapshots").insert(snapshotsToInsert.slice(i, i + 500));
    }
  }

  const discoveredCountries = new Set(discovered.map((d) => d.country_code)).size;

  return NextResponse.json({
    ok: true,
    skipped: false,
    discovered_ranks: discovered.length,
    discovered_countries: discoveredCountries,
    message: "Discovery completed successfully across global markets",
  });
}
