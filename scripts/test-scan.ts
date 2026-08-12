import { discoverRanksAcrossCountries, lookupApp } from "../lib/apple";
import { SCAN_COUNTRY_CODES } from "../lib/constants";

async function testApp(appleId: string, name: string) {
  console.log(`\n========================================`);
  console.log(`Testing App: ${name} (${appleId})`);
  
  const appInfo = await lookupApp(appleId);
  console.log(`Lookup info:`, appInfo);

  if (!appInfo) {
    console.log(`App not found via lookupApp!`);
    return;
  }

  const ranks = await discoverRanksAcrossCountries({
    appleId,
    genreId: appInfo.primaryGenreId,
    countries: SCAN_COUNTRY_CODES,
    concurrency: 15,
  });

  const uniqueCountries = new Set(ranks.map(r => r.country_code));
  console.log(`Discovered ${ranks.length} total rank entries across ${uniqueCountries.size} countries.`);
  console.log(`Countries:`, Array.from(uniqueCountries).sort());
  console.log(`Sample ranks:`, ranks.slice(0, 10));
}

async function main() {
  await testApp("6741796873", "TikTok Pro - Events");
  await testApp("6448311069", "ChatGPT");
  await testApp("6473753684", "Claude");
}

main().catch(console.error);
