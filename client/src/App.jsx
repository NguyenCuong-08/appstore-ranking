import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchRanking } from './api'
import { GENRES, GAME_SUBGENRES, COUNTRIES, CHARTS } from './data'
import './App.css'

function countryName(code) {
  return COUNTRIES.find((c) => c.code === code)?.name || code.toUpperCase()
}

function genreLabel(value) {
  return GENRES.find((g) => g.value === value)?.label
    || GAME_SUBGENRES.find((g) => g.value === value)?.label
    || 'All Categories'
}

function rankBadge(rank) {
  if (rank <= 3) return `top-${rank}`
  return ''
}

function App() {
  const [country, setCountry] = useState('us')
  const [category, setCategory] = useState('all')
  const [chart, setChart] = useState('top-free')
  const [limit, setLimit] = useState(100)
  const [apps, setApps] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async ({ country: c, category: cat, chart: ch, limit: lim, refresh: r }) => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRanking({ country: c, category: cat, chart: ch, limit: lim, refresh: r })
      if (requestId.current !== id) return
      setApps(data.apps || [])
      setMeta(data)
    } catch (err) {
      if (requestId.current !== id) return
      setApps([])
      setError(err.message)
    } finally {
      if (requestId.current === id) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load({ country, category, chart, limit, refresh })
    setRefresh(false)
  }, [country, category, chart, limit, load])

  const doRefresh = () => {
    setRefresh(true)
    load({ country, category, chart, limit, refresh: true })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return apps
    return apps.filter((a) => a.name.toLowerCase().includes(q) || String(a.id).includes(q))
  }, [apps, search])

  const matchRank = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    const found = apps.find((a) => a.name.toLowerCase() === q || String(a.id) === q)
    if (found) return found.rank
    return 'not-found'
  }, [apps, search])

  return (
    <div className="wrap">
      <header>
        <h1>App Store Ranking</h1>
        <p className="sub">
          Xem hạng của ứng dụng trên App Store theo quốc gia &amp; danh mục
          {meta && meta.cached && <span className="chip cached">cached</span>}
          {meta && meta.genreApplied === false && (
            <span className="chip warn" title="Fallback source không hỗ trợ lọc category">no genre filter</span>
          )}
        </p>
      </header>

      <div className="controls">
        <label>
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <optgroup label="All">
              <option value="all">All Categories</option>
            </optgroup>
            <optgroup label="App Store">
              {GENRES.filter((g) => g.value !== 'all').map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
            <optgroup label="Games sub-categories">
              {GAME_SUBGENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
          </select>
        </label>

        <div className="chart-group">
          {CHARTS.map((ch) => (
            <button
              key={ch.value}
              type="button"
              className={`chart-btn ${chart === ch.value ? 'active' : ''}`}
              onClick={() => setChart(ch.value)}
            >
              {ch.label}
            </button>
          ))}
        </div>

        <label>
          Limit
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={100}>100</option>
            <option value={50}>50</option>
            <option value={25}>25</option>
            <option value={10}>10</option>
          </select>
        </label>

        <button type="button" className="refresh-btn" onClick={doRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by app name or app ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {matchRank !== null && (
          <span className={`search-result ${matchRank === 'not-found' ? 'nf' : ''}`}>
            {matchRank === 'not-found'
              ? 'Not in this chart'
              : `Rank #${matchRank}`}
          </span>
        )}
      </div>

      {error && (
        <div className="error">
          <strong>Lỗi:</strong> {error}
          <button type="button" onClick={doRefresh}>Thử lại</button>
        </div>
      )}

      {!error && (
        <>
          <div className="meta-line">
            {meta && (
              <span>
                {countryName(meta.country)} · {genreLabel(meta.category)} · {meta.chart}
                {meta.genreId ? ` (genre ${meta.genreId})` : ''}
                {' '}· {meta.apps.length} apps
                {meta.updatedAt && ` · updated ${new Date(meta.updatedAt).toLocaleTimeString()}`}
              </span>
            )}
          </div>
          <table className="ranking">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-icon"></th>
                <th>App</th>
                <th className="col-dev">Developer</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className={rankBadge(app.rank)}>
                  <td className="col-rank rank-num">{app.rank}</td>
                  <td className="col-icon">
                    {app.icon ? <img src={app.icon} alt="" width="40" height="40" /> : <span className="no-icon" />}
                  </td>
                  <td>
                    <div className="app-name">
                      <a href={app.url} target="_blank" rel="noreferrer">{app.name}</a>
                      {app.id && <span className="app-id">ID {app.id}</span>}
                    </div>
                  </td>
                  <td className="col-dev">{app.developer}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="empty">Không tìm thấy app nào khớp với từ khoá “{search}”.</div>
          )}
        </>
      )}
    </div>
  )
}

export default App
