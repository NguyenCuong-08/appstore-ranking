import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { discoverRanksAcrossCountries, lookupApp } from "../lib/apple";
import { SCAN_COUNTRY_CODES } from "../lib/constants";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncApp(app: any) {
  console.log(`\n========================================`);
  console.log(`Syncing app: ${app.name} (${app.apple_id}) - DB ID: ${app.id}`);

  // 1. Refresh metadata if needed
  const lookup = await lookupApp(app.apple_id);
  if (lookup) {
    await supabase.from("apps").update({
      name: lookup.trackName || app.name,
      developer: lookup.artistName || app.developer,
      icon_url: lookup.artworkUrl100 || app.icon_url,
      primary_category_id: lookup.primaryGenreId ?? app.primary_category_id,
      price: lookup.price ?? app.price,
      rating: lookup.averageUserRating ?? app.rating,
      rating_count: lookup.userRatingCount || app.rating_count,
      last_metadata_sync_at: new Date().toISOString(),
    }).eq("id", app.id);
  }

  const genreId = lookup?.primaryGenreId ?? app.primary_category_id;

  // 2. Discover ranks across all 160+ countries
  const startTime = Date.now();
  console.log(`Discovering ranks across ${SCAN_COUNTRY_CODES.length} countries...`);
  const discovered = await discoverRanksAcrossCountries({
    appleId: app.apple_id,
    genreId,
    countries: SCAN_COUNTRY_CODES,
    concurrency: 30,
  });

  const elapsed = Date.now() - startTime;
  const uniqueCountries = new Set(discovered.map((d) => d.country_code));
  console.log(`Discovery finished in ${elapsed}ms! Found ${discovered.length} rank entries across ${uniqueCountries.size} countries.`);

  // 3. Save snapshots to DB
  if (discovered.length > 0) {
    const snapshots = discovered.map((d) => ({
      app_id: app.id,
      country_code: d.country_code,
      category_id: d.category_id ?? null,
      chart_type: d.chart_type,
      rank: d.rank,
    }));

    for (let i = 0; i < snapshots.length; i += 500) {
      const { error } = await supabase.from("rank_snapshots").insert(snapshots.slice(i, i + 500));
      if (error) {
        console.error("Snapshot insert error:", error);
      }
    }
  }

  // 4. Verify count in DB
  const { data: dbSnaps } = await supabase
    .from("rank_snapshots")
    .select("country_code")
    .eq("app_id", app.id);

  const dbCountries = new Set(dbSnaps?.map((s) => s.country_code) ?? []);
  console.log(`DB Verification for ${app.name}: Total DB rank entries = ${dbSnaps?.length}, Unique DB Countries = ${dbCountries.size}`);
  console.log(`Countries list:`, Array.from(dbCountries).sort().join(", "));
}

async function main() {
  const { data: apps, error } = await supabase.from("apps").select("*");
  if (error || !apps) {
    console.error("Error fetching apps from DB:", error);
    return;
  }

  console.log(`Found ${apps.length} apps in DB to sync...`);
  for (const app of apps) {
    await syncApp(app);
  }

  console.log(`\n✅ ALL APPS SYNCED SUCCESSFULLY!`);
}

main().catch(console.error);
