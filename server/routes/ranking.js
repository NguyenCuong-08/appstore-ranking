import { Router } from "express";
import { fetchTopCharts } from "../services/appleApi.js";
import { getCache, setCache, getStats } from "../cache/cache.js";
import { GENRES, GAME_SUBGENRES } from "../data/genres.js";

const router = Router();

function resolveGenreId(category) {
  if (!category || category === "all") return undefined;
  if (GENRES[category] !== undefined) return GENRES[category];
  if (GAME_SUBGENRES[category] !== undefined) return GAME_SUBGENRES[category];
  return undefined;
}

router.get("/ranking", async (req, res) => {
  const {
    country = "us",
    category = "all",
    chart = "top-free",
    limit = 100,
    refresh = "false",
  } = req.query;

  const safeLimit = Math.min(Number(limit) || 100, 100);
  const genreId = resolveGenreId(category);
  const cacheKey = `${country}-${category}-${chart}-${safeLimit}`;

  const forceRefresh = refresh === "true" || refresh === "1";
  if (!forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  try {
    const { apps, genreApplied, source } = await fetchTopCharts({
      country,
      chart,
      genreId,
      limit: safeLimit,
    });
    const payload = {
      country,
      category,
      chart,
      limit: safeLimit,
      genreId: genreId ?? null,
      genreApplied,
      source,
      updatedAt: new Date().toISOString(),
      apps,
      cached: false,
    };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch Apple charts", detail: err.message });
  }
});

router.get("/app-rank", async (req, res) => {
  const { appId, country = "us", category = "all", chart = "top-free" } = req.query;
  if (!appId) {
    return res.status(400).json({ error: "Missing appId" });
  }
  const genreId = resolveGenreId(category);

  try {
    const { apps } = await fetchTopCharts({ country, chart, genreId, limit: 100 });
    const found = apps.find((a) => String(a.id) === String(appId).trim());
    if (found) {
      return res.json({ found: true, ...found });
    }
    res.json({ found: false, message: "App not in top 100" });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch Apple charts", detail: err.message });
  }
});


router.get("/health", (req, res) => {
  res.json({ ok: true, cache: getStats() });
});

export default router;
