import type { ChartEntry, ChartType, LookupApp } from "./types";

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
  artworkUrl100?: string;
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
  return {
    trackId: Number(result.trackId),
    trackName: result.trackName || "",
    artistName: result.artistName || "",
    artworkUrl100: result.artworkUrl100 || null,
    primaryGenreId: result.primaryGenreId ?? null,
    price: Number(result.price) || 0,
    averageUserRating: result.averageUserRating ?? null,
    userRatingCount: Number(result.userRatingCount) || 0,
    trackViewUrl: result.trackViewUrl || "",
    bundleId: result.bundleId || null,
  };
}

export async function lookupApps(ids: string[]): Promise<LookupApp[]> {
  const uniqueIds = [...new Set(ids.map((i) => String(i).trim()).filter(Boolean))];
  const results: LookupApp[] = [];
  const BATCH = 100;

  for (let i = 0; i < uniqueIds.length; i += BATCH) {
    const chunk = uniqueIds.slice(i, i + BATCH);
    const url = `https://itunes.apple.com/lookup?id=${chunk.join(",")}&country=us`;
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
  const results = await lookupApps([id]);
  return results[0] ?? null;
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
