# Phase 2 — Next.js 15 + Supabase (App Store Rank Tracker)

Web theo dõi thứ hạng ứng dụng App Store theo quốc gia & danh mục.
Đã hoàn thành và hoạt động tại `http://localhost:3000`.

## Stack
Next.js 15 (App Router, TS, Tailwind v4) + Supabase (Postgres, Auth, RLS)
+ Recharts + shadcn/ui. Đơn user (không cần đăng nhập), deploy Vercel.

## Đã làm
- **Scaffold**: xoá Phase 1 (Vite/Express), dựng Next.js 15 + deps + shadcn/ui.
- **Schema SQL** (`supabase/schema.sql`): bảng `countries`, `categories`, `apps`,
  `tracked_apps`, `rank_snapshots`, `rank_alerts` + RLS + RPC
  (`get_needed_chart_combos`, `get_latest_ranks`, `get_my_apps_stats`,
  `delete_old_snapshots`). Apply lên Supabase thành công.
- **Seed** (`scripts/seed.ts`): 175 nước + 26 category.
- **lib/supabase**: server / service-role (chỉ cron/scripts) / browser clients.
- **lib/apple.ts**: fetchTopCharts (cap 200), lookupApps (batch + delay),
  searchApps, extractAppleId.
- **API routes**:
  - `GET /api/charts` — bảng rank (public).
  - `GET /api/search` — tìm app iTunes (public).
  - `POST /api/apps` — lưu theo `apple_id` (đã có → chỉ track; chưa có → lookup).
  - `GET|PATCH|DELETE /api/apps/[id]` — detail + pin countries + untrack.
  - `GET /api/apps/[id]/rank-history` — chuỗi thời gian cho chart.
  - `CRUD /api/alerts` (+ `DELETE /api/alerts/[id]`).
  - `GET /api/cron/sync-ranks` (Bearer CRON_SECRET) — fetch rank, **chỉ insert
    khi rank thay đổi** (test: run 2 liên tiếp → insert 0), dedup 50ph,
    check alerts (chỉ log).
  - `GET /api/cron/sync-metadata` (Bearer) — refresh metadata app hàng ngày.
- **Pages**: `/explore`, `/search`, `/login`, `/my-apps` (+`/my-apps/add`),
  `/app/[appleId]` (stat tiles + bảng rank mọi nước + Recharts line chart).
- **Deploy config**: `vercel.json` cron (6h rank, 3h metadata).

## Bước còn lại
- [ ] Deploy lên Vercel (cần user: `npm i -g vercel`, `vercel` login, set 4 env
      vars, thêm Redirect URL của domain prod vào Supabase Auth).
- [ ] Cấu hình Supabase Auth: Email OTP + Google OAuth (nếu muốn).
- [ ] Verify cron trên prod.

## Chú ý
- Service role key chỉ dùng trong `lib/supabase/service.ts` (cron/scripts).
- Apple không public API số lượt tải → hiển thị Reviews + Ranking score.
- `rank_snapshots` phình to → cron `delete_old_snapshots(90)` định kỳ.
- iTunes rate limit ~20 req/phút → lookup/search batch + delay 1s.
