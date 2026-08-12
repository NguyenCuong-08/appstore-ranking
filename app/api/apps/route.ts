import { NextRequest, NextResponse } from "next/server";
import { createDbClient } from "@/lib/supabase/db";
import { lookupApp, extractAppleId } from "@/lib/apple";
import { DEFAULT_PINNED_COUNTRIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = createDbClient();

  let body: { appleId?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const appleId = extractAppleId(body.url || body.appleId || "");
  if (!appleId) {
    return NextResponse.json(
      { error: "Invalid App Store link or App ID" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("apps")
    .select("*")
    .eq("apple_id", appleId)
    .maybeSingle();

  let app = existing;

  // Always perform lookup if app doesn't exist or if metadata is incomplete/stale
  const needsLookup =
    !app ||
    app.rating === null ||
    app.rating_count === null ||
    app.rating_count === 0 ||
    !app.developer ||
    !app.icon_url;

  if (needsLookup) {
    let lookup;
    try {
      lookup = await lookupApp(appleId);
    } catch (err) {
      if (!app) {
        return NextResponse.json(
          { error: "Failed to reach iTunes", detail: (err as Error).message },
          { status: 502 }
        );
      }
    }

    if (lookup) {
      const payload = {
        apple_id: String(lookup.trackId),
        bundle_id: lookup.bundleId || app?.bundle_id || null,
        name: lookup.trackName || app?.name || "App",
        developer: lookup.artistName || app?.developer || null,
        icon_url: lookup.artworkUrl100 || app?.icon_url || null,
        primary_category_id: lookup.primaryGenreId || app?.primary_category_id || null,
        price: lookup.price ?? app?.price ?? 0,
        rating: lookup.averageUserRating ?? app?.rating ?? null,
        rating_count: lookup.userRatingCount || app?.rating_count || 0,
        last_metadata_sync_at: new Date().toISOString(),
      };

      const { data: upserted, error: appErr } = await supabase
        .from("apps")
        .upsert(payload, { onConflict: "apple_id" })
        .select()
        .single();

      if (appErr && !app) {
        return NextResponse.json(
          { error: "Failed to save app", detail: appErr.message },
          { status: 500 }
        );
      }

      if (upserted) {
        app = upserted;
      }
    }
  }

  if (!app) {
    return NextResponse.json({ error: "App not found on App Store" }, { status: 404 });
  }

  const { error: trackErr } = await supabase.from("tracked_apps").upsert(
    {
      app_id: app.id,
      pinned_countries: DEFAULT_PINNED_COUNTRIES,
    },
    { onConflict: "app_id" }
  );

  if (trackErr) {
    return NextResponse.json(
      { error: "Failed to track app", detail: trackErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ app, tracked: true });
}
