# App Store Ranking Web

Web xem hạng ứng dụng trên App Store theo **quốc gia**, **category** và **loại chart** (Top Free / Top Paid / Top Grossing). Dữ liệu từ feed công khai của Apple — không cần Apple Developer account, không cần API key.

## Kiến trúc

```
appstore-ranking/
├── server/            # Node.js + Express
│   ├── index.js       # API app, port 3000
│   ├── routes/ranking.js
│   ├── services/appleApi.js   # fetch + parse Apple RSS (kèm fallback)
│   ├── cache/cache.js         # cache in-memory TTL 30 phút
│   └── data/                  # bảng genre ID + danh sách quốc gia
├── client/            # Vite + React (frontend, port 5173)
└── README.md
```

## Cách chạy

Yêu cầu: Node.js ≥ 18 (khuyến nghị LTS).

```bash
# Terminal 1 — Backend
cd server
npm install
npm start          # http://localhost:3000

# Terminal 2 — Frontend
cd client
npm install
npm run dev        # http://localhost:5173 (proxy /api → :3000)
```

Mở trình duyệt tại `http://localhost:5173`.

## API

```
GET /api/ranking?country=us&category=games&chart=top-free&limit=100
GET /api/app-rank?appId=123456&country=us&category=games&chart=top-free
GET /api/health
```

- `country`: mã ISO 2 ký tự viết thường (`us`, `vn`, `jp`, `kr`, ...)
- `category`: slug tiếng Anh (`games`, `social`, `finance`, ...) hoặc `all`; hỗ trợ game sub-genre (`games-puzzle`, `games-action`, ...)
- `chart`: `top-free` | `top-paid` | `top-grossing`
- `limit`: tối đa 100 (Apple tự cap ở 100 dù gửi 200)
- Thêm `refresh=true` để bỏ qua cache

## Nguồn dữ liệu

1. **Endpoint chính (ưu tiên):** `https://itunes.apple.com/{country}/rss/{chart}/limit={limit}/genre={genreId}/json`
2. **Fallback:** `https://rss.applemarketingtools.com/api/v2/{country}/apps/top-free/{limit}/apps.json` (không hỗ trợ genre — UI hiển thị cảnh báo khi rơi vào fallback)

Ghi chú: endpoint RSS trả `Content-Type: text/javascript` nên parse bằng `text()` + `JSON.parse()` thay vì `res.json()`.

## Deploy gợi ý

- Backend: Render / Railway (free) — set `PORT` tự động.
- Frontend: Vercel / Netlify — build `npm run build`, output `dist/`; đổi proxy `/api` thành URL backend thật qua biến env `VITE_API_URL` (hoặc rewrite trong config nền tảng).
