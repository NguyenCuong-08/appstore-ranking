import { loadEnvFile } from "node:process";
import { createServiceRoleClient } from "../lib/supabase/service";
import { COUNTRY_NAMES } from "../lib/constants";

try {
  loadEnvFile(".env.local");
} catch {
  // env already set in environment
}

const GENRES: Array<[number, string]> = [
  [6000, "Business"],
  [6001, "Weather"],
  [6002, "Utilities"],
  [6003, "Travel"],
  [6004, "Sports"],
  [6005, "Social Networking"],
  [6006, "Reference"],
  [6007, "Productivity"],
  [6008, "Photo & Video"],
  [6009, "News"],
  [6010, "Navigation"],
  [6011, "Music"],
  [6012, "Lifestyle"],
  [6013, "Health & Fitness"],
  [6014, "Games"],
  [6015, "Finance"],
  [6016, "Entertainment"],
  [6017, "Education"],
  [6018, "Books"],
  [6020, "Medical"],
  [6021, "Magazines & Newspapers"],
  [6022, "Catalogs"],
  [6023, "Food & Drink"],
  [6024, "Shopping"],
  [6026, "Developer Tools"],
  [6027, "Graphics & Design"],
];

async function main() {
  const supabase = createServiceRoleClient();

  const countryRows = Object.entries(COUNTRY_NAMES).map(([code, name]) => ({
    code,
    name,
    region: null,
  }));

  const { error: cErr } = await supabase
    .from("countries")
    .upsert(countryRows, { onConflict: "code" });
  if (cErr) throw cErr;
  console.log(`Seeded ${countryRows.length} countries`);

  const categoryRows = GENRES.map(([genre_id, name]) => ({ genre_id, name }));
  const { error: gErr } = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "genre_id" });
  if (gErr) throw gErr;
  console.log(`Seeded ${categoryRows.length} categories`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
