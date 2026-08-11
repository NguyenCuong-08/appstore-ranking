const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchRanking({ country, category, chart, limit = 100, refresh = false }) {
  const params = new URLSearchParams({
    country,
    category,
    chart,
    limit: String(limit),
  });
  if (refresh) params.set('refresh', 'true');

  const res = await fetch(`${API_BASE}/api/ranking?${params.toString()}`);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || err.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}
