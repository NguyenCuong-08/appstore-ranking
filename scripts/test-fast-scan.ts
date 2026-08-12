import { SCAN_COUNTRY_CODES } from "../lib/constants";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function scanFast(appleId: string, name: string) {
  const startTime = Date.now();
  console.log(`\nStarting fast scan for ${name} (${appleId}) across ${SCAN_COUNTRY_CODES.length} countries...`);

  const charts = ["top-free", "top-paid"];
  const tasks: Array<{ country: string; chart: string }> = [];

  for (const c of SCAN_COUNTRY_CODES) {
    for (const ch of charts) {
      tasks.push({ country: c, chart: ch });
    }
  }

  const results: Array<{ country: string; chart: string; rank: number }> = [];
  const concurrency = 40;
  let idx = 0;

  while (idx < tasks.length) {
    const batch = tasks.slice(idx, idx + concurrency);
    idx += concurrency;

    await Promise.all(
      batch.map(async (t) => {
        try {
          const url = `https://rss.applemarketingtools.com/api/v2/${t.country}/apps/${t.chart}/100/apps.json`;
          const res = await fetch(url, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(2500),
          });
          if (!res.ok) return;
          const data = await res.json();
          const list = data.feed?.results ?? [];
          const pos = list.findIndex((item: any) => String(item.id) === String(appleId));
          if (pos !== -1) {
            results.push({ country: t.country, chart: t.chart, rank: pos + 1 });
          }
        } catch {
          // ignore error/timeout
        }
      })
    );
  }

  const elapsed = Date.now() - startTime;
  const uniqueCountries = new Set(results.map((r) => r.country));
  console.log(`Scan completed in ${elapsed}ms!`);
  console.log(`Found ${name} in ${results.length} chart entries across ${uniqueCountries.size} countries.`);
  console.log(`Countries (${uniqueCountries.size}):`, Array.from(uniqueCountries).sort().join(", "));
  console.log(`Ranks detail:`, results);
}

async function main() {
  await scanFast("6741796873", "TikTok Pro - Events");
  await scanFast("6448311069", "ChatGPT");
  await scanFast("6473753684", "Claude");
}

main().catch(console.error);
