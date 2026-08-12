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
    .select("id, apple_id, name")
    .eq("apple_id", appleId)
    .maybeSingle();

  let app = existing;

  if (!app) {
    let lookup;
    try {
      lookup = await lookupApp(appleId);
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to reach iTunes", detail: (err as Error).message },
        { status: 502 }
      );
    }

    if (!lookup) {
      return NextResponse.json({ error: "App not found on App Store" }, { status: 404 });
    }

    const { data: inserted, error: appErr } = await supabase
      .from("apps")
      .upsert(
        {
          apple_id: String(lookup.trackId),
          bundle_id: lookup.bundleId,
          name: lookup.trackName,
          developer: lookup.artistName,
          icon_url: lookup.artworkUrl100,
          primary_category_id: lookup.primaryGenreId,
          price: lookup.price,
          rating: lookup.averageUserRating,
          rating_count: lookup.userRatingCount,
          last_metadata_sync_at: new Date().toISOString(),
        },
        { onConflict: "apple_id" }
      )
      .select()
      .single();

    if (appErr) {
      return NextResponse.json(
        { error: "Failed to save app", detail: appErr.message },
        { status: 500 }
      );
    }
    app = inserted;
  }

  if (!app) {
    return NextResponse.json({ error: "Failed to save app" }, { status: 500 });
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
