import { NextRequest, NextResponse } from "next/server";
import { createDbClient, getLatestOverallRanks } from "@/lib/supabase/db";
import { COUNTRY_CODES } from "@/lib/constants";
import type { LatestRank } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createDbClient();

  const { data: app, error: appErr } = await supabase
    .from("apps")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (appErr || !app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const latestRanks: LatestRank[] = await getLatestOverallRanks(supabase, id);

  const { data: ta } = await supabase
    .from("tracked_apps")
    .select("pinned_countries")
    .eq("app_id", id)
    .maybeSingle();

  const tracking = Boolean(ta);
  const pinnedCountries = ta?.pinned_countries ?? [];

  return NextResponse.json({
    app,
    tracking,
    pinned_countries: pinnedCountries,
    latest_ranks: latestRanks,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createDbClient();

  let body: { pinned_countries?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pinned = body.pinned_countries ?? [];
  const valid = pinned.every(
    (c) => typeof c === "string" && COUNTRY_CODES.includes(c)
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid country codes" }, { status: 400 });
  }

  const { error } = await supabase
    .from("tracked_apps")
    .update({ pinned_countries: pinned })
    .eq("app_id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, pinned_countries: pinned });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createDbClient();

  const { error } = await supabase
    .from("tracked_apps")
    .delete()
    .eq("app_id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to untrack", detail: error.message },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
