import { discoverRanksAcrossCountries } from "../lib/apple";
import { SCAN_COUNTRY_CODES } from "../lib/constants";

async function testApp(appleId: string, name: string, genreId: number | null) {
  console.log(`Scanning ${name} (${appleId}) across ${SCAN_COUNTRY_CODES.length} countries...`);
  const ranks = await discoverRanksAcrossCountries({
    appleId,
    genreId,
    countries: SCAN_COUNTRY_CODES,
    concurrency: 20,
  });
  const countries = new Set(ranks.map((r) => r.country_code));
  console.log(`RESULT for ${name}: Discovered ${ranks.length} ranks across ${countries.size} countries:`);
  console.log(
    Array.from(countries)
      .sort()
      .map((c) => {
        const r = ranks.filter((x) => x.country_code === c);
        return `${c}: ${r.map((x) => `${x.chart_type}${x.category_id ? `(cat:${x.category_id})` : ""}=${x.rank}`).join(", ")}`;
      })
      .join("\n")
  );
}

async function main() {
  await testApp("6741796873", "TikTok Pro - Events", 6016); // Entertainment
  await testApp("6473753684", "Claude", 6007); // Productivity
}

main().catch(console.error);
