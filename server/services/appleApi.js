const CHART_MAP = {
  "top-free": "topfreeapplications",
  "top-paid": "toppaidapplications",
  "top-grossing": "topgrossingapplications",
};

const CHART_MAP_FALLBACK = {
  "top-free": "top-free",
  "top-paid": "top-paid",
  "top-grossing": "top-grossing",
};

function normalizeEntries(entries) {
  return Array.isArray(entries) ? entries : entries ? [entries] : [];
}

function mapLegacyEntry(entry, idx) {
  const images = entry["im:image"] || [];
  const icon = images.length ? images[images.length - 1].label : null;
  return {
    rank: idx + 1,
    id: entry.id?.attributes?.["im:id"] || entry.id?.label,
    name: entry["im:name"]?.label || "",
    developer: entry["im:artist"]?.label || "",
    icon,
    url: entry.id?.label || "",
  };
}

async function fetchLegacy({ country, chart, genreId, limit }) {
  const chartPath = CHART_MAP[chart] || CHART_MAP["top-free"];
  let url = `https://itunes.apple.com/${country}/rss/${chartPath}/limit=${limit}/json`;
  if (genreId) {
    url = `https://itunes.apple.com/${country}/rss/${chartPath}/limit=${limit}/genre=${genreId}/json`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Apple RSS error: ${res.status}`);
  }
  const text = await res.text();
  const data = JSON.parse(text);
  return normalizeEntries(data.feed?.entry || []).map(mapLegacyEntry);
}

async function fetchFallback({ country, chart, limit }) {
  const chartPath = CHART_MAP_FALLBACK[chart] || CHART_MAP_FALLBACK["top-free"];
  const url = `https://rss.applemarketingtools.com/api/v2/${country}/apps/${chartPath}/${limit}/apps.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Apple fallback error: ${res.status}`);
  }
  const data = await res.json();
  const results = data.feed?.results || [];
  return results.map((app, idx) => ({
    rank: idx + 1,
    id: String(app.id || ""),
    name: app.name || "",
    developer: app.artistName || "",
    icon: app.artworkUrl100 || "",
    url: app.url || "",
  }));
}

export async function fetchTopCharts({ country = "us", chart = "top-free", genreId, limit = 100 }) {
  const safeLimit = Math.min(Number(limit) || 100, 100);
  try {
    const apps = await fetchLegacy({ country, chart, genreId, limit: safeLimit });
    return { apps, genreApplied: true, source: "rss" };
  } catch (err) {
    if (genreId) {
      throw err;
    }
    try {
      const apps = await fetchFallback({ country, chart, limit: safeLimit });
      return { apps, genreApplied: false, source: "fallback" };
    } catch (fallbackErr) {
      throw new Error(`${err.message} | fallback: ${fallbackErr.message}`);
    }
  }
}
