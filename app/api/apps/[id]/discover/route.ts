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

  const { apple_id, force = false, full = false } = body;

  if (!apple_id) {
    return NextResponse.json({ error: "apple_id required" }, { status: 400 });
  }

  // Check staleness: nếu data còn fresh và không force → skip
  const STALE_MS = 6 * 3600 * 1000;
  const currentRanks = await getLatestOverallRanks(supabase, id);
  const latestCaptured = currentRanks.reduce(
    (max, r) =>
      r.captured_at ? Math.max(max, new Date(r.captured_at).getTime()) : max,
    0
  );
  const isFresh = currentRanks.length >= 4 && Date.now() - latestCaptured < STALE_MS;

  if (isFresh && !force) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "Data is fresh, skipped discovery",
      rank_count: currentRanks.length,
    });
  }

  // Chọn danh sách nước cần quét:
  // - full=true → tất cả ~160 nước (chậm hơn, đầy đủ hơn)
  // - full=false → chỉ 24 nước ưu tiên (nhanh cho lần đầu load trang)
  const countriesToScan = full ? SCAN_COUNTRY_CODES : PRIORITY_SCAN_COUNTRIES;

  // Lấy primary_category_id của app từ DB
  const { data: appRow } = await supabase
    .from("apps")
    .select("primary_category_id")
    .eq("id", id)
    .maybeSingle();
  const genreId = appRow?.primary_category_id ?? null;

  // Pha 1: Quét nhanh các nước ưu tiên (PRIORITY_SCAN_COUNTRIES) trong ~0.5s
  let priorityDiscovered: Awaited<ReturnType<typeof discoverRanksAcrossCountries>> = [];
  try {
    priorityDiscovered = await discoverRanksAcrossCountries({
      appleId: apple_id,
      genreId,
      countries: PRIORITY_SCAN_COUNTRIES,
      concurrency: 15,
    });
  } catch (err) {
    console.error("[discover] Priority scan error:", err);
  }

  // Lưu kết quả pha 1 vào DB
  if (priorityDiscovered.length > 0) {
    const snapshotsToInsert = priorityDiscovered.map((d) => ({
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

  // Pha 2: Quét nốt toàn bộ các nước còn lại (SCAN_COUNTRY_CODES) dưới dạng background task
  const remainingCountries = SCAN_COUNTRY_CODES.filter(
    (c) => !PRIORITY_SCAN_COUNTRIES.includes(c)
  );

  if (remainingCountries.length > 0) {
    void (async () => {
      try {
        const fullDiscovered = await discoverRanksAcrossCountries({
          appleId: apple_id,
          genreId,
          countries: remainingCountries,
          concurrency: 15,
        });
        if (fullDiscovered.length > 0) {
          const snapshotsToInsert = fullDiscovered.map((d) => ({
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
      } catch (err) {
        console.error("[discover] Background full scan error:", err);
      }
    })();
  }

  // Trả về 200 OK ngay lập tức (< 0.5s) để không bao giờ bị 504 Gateway Timeout trên Vercel
  return NextResponse.json({
    ok: true,
    skipped: false,
    priority_count: priorityDiscovered.length,
    message: "Discovery initialized successfully",
  });
}
