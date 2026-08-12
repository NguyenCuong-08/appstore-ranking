import type { ChartEntry, ChartType, LookupApp } from "./types";
import { SCAN_COUNTRY_CODES } from "./constants";

const CHART_MAP: Record<string, string> = {
  "top-free": "topfreeapplications",
  "top-paid": "toppaidapplications",
  "top-grossing": "topgrossingapplications",
};

const CHART_MAP_FALLBACK: Record<string, string> = {
  "top-free": "top-free",
  "top-paid": "top-paid",
  "top-grossing": "top-grossing",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface LegacyImage {
  label?: string;
}

interface LegacyEntry {
  id?: { attributes?: { "im:id"?: string }; label?: string };
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: LegacyImage[];
}

interface FallbackResult {
  id?: number;
  name?: string;
  artistName?: string;
  artworkUrl100?: string;
  url?: string;
}

interface LookupResult {
  kind?: string;
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl512?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  primaryGenreId?: number;
  price?: number;
  averageUserRating?: number | null;
  userRatingCount?: number;
  trackViewUrl?: string;
  bundleId?: string | null;
}

function normalizeEntries(entries: unknown): unknown[] {
  return Array.isArray(entries) ? entries : entries ? [entries] : [];
}

function mapLegacyEntry(entry: LegacyEntry, idx: number): ChartEntry {
  const images = entry["im:image"] || [];
  const icon = images.length ? images[images.length - 1].label ?? null : null;
  return {
    rank: idx + 1,
    id: entry.id?.attributes?.["im:id"] || entry.id?.label || "",
    name: entry["im:name"]?.label || "",
    developer: entry["im:artist"]?.label || "",
    icon,
    url: entry.id?.label || "",
  };
}

async function fetchLegacy({
  country,
  chart,
  genreId,
  limit,
}: {
  country: string;
  chart: string;
  genreId?: number;
  limit: number;
}): Promise<ChartEntry[]> {
  const chartPath = CHART_MAP[chart] || CHART_MAP["top-free"];
  let url = `https://itunes.apple.com/${country}/rss/${chartPath}/limit=${limit}/json`;
  if (genreId) {
    url = `https://itunes.apple.com/${country}/rss/${chartPath}/limit=${limit}/genre=${genreId}/json`;
  }

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Apple RSS error: ${res.status}`);
  }
  const text = await res.text();
  const data = JSON.parse(text);
  const entries = normalizeEntries(data.feed?.entry) as LegacyEntry[];
  return entries.map((e, idx) => mapLegacyEntry(e, idx));
}

async function fetchFallback({
  country,
  chart,
  limit,
}: {
  country: string;
  chart: string;
  limit: number;
}): Promise<ChartEntry[]> {
  const chartPath = CHART_MAP_FALLBACK[chart] || CHART_MAP_FALLBACK["top-free"];
  const url = `https://rss.applemarketingtools.com/api/v2/${country}/apps/${chartPath}/${limit}/apps.json`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Apple fallback error: ${res.status}`);
  }
  const data = await res.json();
  const results = (data.feed?.results ?? []) as FallbackResult[];
  return results.map((app, idx) => ({
    rank: idx + 1,
    id: String(app.id ?? ""),
    name: app.name || "",
    developer: app.artistName || "",
    icon: app.artworkUrl100 || null,
    url: app.url || "",
  }));
}

export async function fetchTopCharts({
  country = "us",
  chart = "top-free",
  genreId,
  limit = 100,
}: {
  country?: string;
  chart?: string;
  genreId?: number;
  limit?: number;
}): Promise<ChartEntry[]> {
  const safeLimit = Math.min(Number(limit) || 100, 200);
  try {
    const apps = await fetchLegacy({ country, chart, genreId, limit: safeLimit });
    return apps;
  } catch (err) {
    if (genreId) {
      throw err;
    }
    try {
      return await fetchFallback({ country, chart, limit: safeLimit });
    } catch (fallbackErr) {
      throw new Error(`${(err as Error).message} | fallback: ${(fallbackErr as Error).message}`);
    }
  }
}

function mapLookup(result: LookupResult): LookupApp {
  const icon = result.artworkUrl512 || result.artworkUrl100 || null;
  return {
    trackId: Number(result.trackId),
    trackName: result.trackName || "",
    artistName: result.artistName || "",
    artworkUrl100: icon,
    primaryGenreId: result.primaryGenreId ?? null,
    price: result.price !== undefined ? Number(result.price) : 0,
    averageUserRating: result.averageUserRating ?? null,
    userRatingCount: Number(result.userRatingCount) || 0,
    trackViewUrl: result.trackViewUrl || "",
    bundleId: result.bundleId || null,
  };
}

export async function lookupApps(ids: string[], country = "us"): Promise<LookupApp[]> {
  const uniqueIds = [...new Set(ids.map((i) => String(i).trim()).filter(Boolean))];
  const results: LookupApp[] = [];
  const BATCH = 100;

  for (let i = 0; i < uniqueIds.length; i += BATCH) {
    const chunk = uniqueIds.slice(i, i + BATCH);
    const url = `https://itunes.apple.com/lookup?id=${chunk.join(",")}&country=${country}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`iTunes lookup error: ${res.status}`);
    }
    const data = await res.json();
    for (const result of data.results ?? []) {
      if (result.kind === "software" || result.wrapperType === "software") {
        results.push(mapLookup(result));
      }
    }
    if (i + BATCH < uniqueIds.length) {
      await sleep(1000);
    }
  }

  return results;
}

export async function lookupApp(id: string): Promise<LookupApp | null> {
  // First try US lookup
  const usResults = await lookupApps([id], "us");
  let app = usResults[0] ?? null;

  // If rating is missing or count is 0, try Vietnam store lookup for local apps (or default lookup without country)
  if (!app || !app.averageUserRating || app.userRatingCount === 0) {
    try {
      const vnResults = await lookupApps([id], "vn");
      if (vnResults[0]) {
        if (!app) {
          app = vnResults[0];
        } else if (vnResults[0].userRatingCount > app.userRatingCount) {
          app = {
            ...app,
            averageUserRating: vnResults[0].averageUserRating ?? app.averageUserRating,
            userRatingCount: vnResults[0].userRatingCount,
            artistName: vnResults[0].artistName || app.artistName,
            artworkUrl100: vnResults[0].artworkUrl100 || app.artworkUrl100,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  // If still missing rating, try global lookup without country parameter
  if (!app || !app.averageUserRating || app.userRatingCount === 0) {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        const raw = data.results?.[0];
        if (raw) {
          const globalApp = mapLookup(raw);
          if (!app) {
            app = globalApp;
          } else if (globalApp.userRatingCount > app.userRatingCount) {
            app = {
              ...app,
              averageUserRating: globalApp.averageUserRating ?? app.averageUserRating,
              userRatingCount: globalApp.userRatingCount,
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return app;
}

export async function searchApps(term: string, country = "us"): Promise<LookupApp[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term
  )}&country=${country}&entity=software&limit=25`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`iTunes search error: ${res.status}`);
  }
  const data = await res.json();
  return (data.results ?? []).map(mapLookup);
}

export function extractAppleId(input: string): string | null {
  const trimmed = input.trim();
  const linkMatch = trimmed.match(/\/id(\d{6,})/);
  if (linkMatch) return linkMatch[1];
  const raw = trimmed.replace(/[^\d]/g, "");
  if (/^\d{6,}$/.test(raw)) return raw;
  return null;
}

export function chartPathFor(chart: ChartType): string {
  return CHART_MAP[chart] || CHART_MAP["top-free"];
}

export interface DiscoveredRank {
  country_code: string;
  chart_type: ChartType;
  rank: number;
}

/**
 * Fetch overall top chart (không filter genre) cho 1 quốc gia.
 * Nguồn chính: Apple Marketing Tools RSS (chỉ hỗ trợ top-free/top-paid),
 * fallback: legacy iTunes RSS.
 */
export async function fetchOverallChart(
  country: string,
  chart: ChartType,
  limit = 100
): Promise<ChartEntry[]> {
  const chartPath = CHART_MAP_FALLBACK[chart];
  if (chartPath) {
    try {
      const url = `https://rss.applemarketingtools.com/api/v2/${country}/apps/${chartPath}/${limit}/apps.json`;
      const res = await fetch(url, { next: { revalidate: 1800 } });
      if (!res.ok) throw new Error(`Apple Marketing Tools error: ${res.status}`);
      const data = await res.json();
      const results = (data.feed?.results ?? []) as FallbackResult[];
      return results.map((app, idx) => ({
        rank: idx + 1,
        id: String(app.id ?? ""),
        name: app.name || "",
        developer: app.artistName || "",
        icon: app.artworkUrl100 || null,
        url: app.url || "",
      }));
    } catch {
      // fallthrough to legacy endpoint
    }
  }
  return fetchTopCharts({ country, chart, limit });
}

/**
 * Quét rank của 1 app trên tất cả các nước × 2 chart (top-free, top-paid),
 * luôn dùng chart OVERALL (không filter genre). Kết quả sort tăng dần theo rank.
 * Chạy song song có giới hạn + delay giữa các batch để tránh bị Apple rate-limit.
 */
export async function discoverRanksAcrossCountries({
  appleId,
  countries = SCAN_COUNTRY_CODES,
  concurrency = 10,
}: {
  appleId: string;
  countries?: string[];
  concurrency?: number;
}): Promise<DiscoveredRank[]> {
  const charts: ChartType[] = ["top-free", "top-paid"];
  const tasks: Array<{ country: string; chart: ChartType }> = [];
  for (const c of countries) {
    for (const ch of charts) {
      tasks.push({ country: c, chart: ch });
    }
  }

  const results: DiscoveredRank[] = [];
  let i = 0;
  while (i < tasks.length) {
    const batch = tasks.slice(i, i + concurrency);
    i += concurrency;
    const settled = await Promise.allSettled(
      batch.map((t) => fetchOverallChart(t.country, t.chart, 100))
    );
    for (let j = 0; j < batch.length; j++) {
      const t = batch[j];
      const res = settled[j];
      if (res.status !== "fulfilled") continue;
      const entry = res.value.find((e) => String(e.id) === String(appleId));
      if (entry) {
        results.push({ country_code: t.country, chart_type: t.chart, rank: entry.rank });
      }
    }
    if (i < tasks.length) await sleep(150);
  }

  results.sort((a, b) => a.rank - b.rank);

  return results;
}
