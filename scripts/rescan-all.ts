import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { discoverRanksAcrossCountries } from "../lib/apple";
import { SCAN_COUNTRY_CODES } from "../lib/constants";

dotenv.config({ path: ".env.local" });

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: tracked } = await supabase.from("tracked_apps").select("app_id");
  const appIds = (tracked ?? []).map((t) => t.app_id);
  const { data: apps } = await supabase
    .from("apps")
    .select("id, apple_id, name, primary_category_id")
    .in("id", appIds);

  console.log(`Found ${(apps ?? []).length} tracked apps\n`);

  for (const app of apps ?? []) {
    console.log(`== ${app.name} (${app.apple_id}) genre=${app.primary_category_id} ==`);
    const discovered = await discoverRanksAcrossCountries({
      appleId: app.apple_id,
      genreId: app.primary_category_id,
      countries: SCAN_COUNTRY_CODES,
      concurrency: 15,
    });
    const countries = new Set(discovered.map((d) => d.country_code));
    console.log(`Discovered ${discovered.length} ranks across ${countries.size} countries`);

    // Xoá snapshot CŨ của app để tránh dữ liệu lẫn (overall/chart cũ không còn đúng)
    await supabase.from("rank_snapshots").delete().eq("app_id", app.id);
    console.log("Cleared old snapshots");

    if (discovered.length > 0) {
      const snapshots = discovered.map((d) => ({
        app_id: app.id,
        country_code: d.country_code,
        category_id: d.category_id ?? null,
        chart_type: d.chart_type,
        rank: d.rank,
      }));
      for (let i = 0; i < snapshots.length; i += 500) {
        const { error } = await supabase
          .from("rank_snapshots")
          .insert(snapshots.slice(i, i + 500));
        if (error) console.error(`Insert error: ${error.message}`);
      }
      console.log(`Inserted ${snapshots.length} snapshots`);
    }
    console.log("");
  }
}

main().catch(console.error);