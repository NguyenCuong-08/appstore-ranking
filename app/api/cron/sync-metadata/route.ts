import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { lookupApps } from "@/lib/apple";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function authorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: staleApps, error: listErr } = await supabase
    .from("apps")
    .select("id, apple_id")
    .or(
      `last_metadata_sync_at.is.null,last_metadata_sync_at.lt.${new Date(
        Date.now() - 86400000
      ).toISOString()}`
    )
    .limit(500);

  if (listErr) {
    return NextResponse.json(
      { error: "Failed to list apps", detail: listErr.message },
      { status: 500 }
    );
  }

  if (!staleApps || staleApps.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const results = await lookupApps(staleApps.map((a) => a.apple_id));
  const byAppleId = new Map(results.map((r) => [String(r.trackId), r]));

  let updated = 0;
  const errors: string[] = [];

  for (const app of staleApps) {
    const meta = byAppleId.get(app.apple_id);
    if (!meta) continue;

    const { error } = await supabase
      .from("apps")
      .update({
        name: meta.trackName,
        developer: meta.artistName,
        icon_url: meta.artworkUrl100,
        primary_category_id: meta.primaryGenreId,
        price: meta.price,
        rating: meta.averageUserRating,
        rating_count: meta.userRatingCount,
        bundle_id: meta.bundleId,
        last_metadata_sync_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    if (error) {
      errors.push(`${app.apple_id}: ${error.message}`);
    } else {
      updated++;
    }
    await sleep(100);
  }

  return NextResponse.json({ ok: true, updated, errors });
}
