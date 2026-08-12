# Phase 2 — Next.js 15 + Supabase (App Store Rank Tracker)

Web theo dõi thứ hạng ứng dụng App Store theo quốc gia & danh mục.
Single-user, deploy **Vercel**, data Supabase (Postgres + RLS).

## Stack
Next.js 15 (App Router, TS, Tailwind v4) + Supabase (Postgres, Auth, RLS)
+ Recharts + shadcn/ui.

## Trạng thái: ĐÃ LIVE ✅
- **Production**: https://appstore-ranking-cuongs-projects-f7638cd4.vercel.app
- Alias: https://appstore-ranking-mu.vercel.app
- GitHub repo: `NguyenCuong-08/appstore-ranking` (public, connected Vercel)

## Tính năng
- `/explore` — bảng rank theo quốc gia/danh mục/bảng xếp hạng (Apple RSS).
- `/search` — tìm app, "Lưu vào My Apps".
- `/my-apps` (+`/my-apps/add`) — app đã theo dõi, best rank, số nước trong top.
- `/app/[appleId]` — stat tiles (rating, reviews, countries, score), bảng top ranking
  theo từng nước, Recharts line chart (top-free/top-paid), pin countries, alerts.
- Cron **sync-ranks**: chỉ insert snapshot khi rank thay đổi + dedup 50ph,
  check alerts (chỉ log). **sync-metadata**: refresh thông tin app hàng ngày.

## Schema & cron
- `supabase/schema.sql` — 6 bảng + RLS + RPC (get_needed_chart_combos,
  get_latest_ranks, get_my_apps_stats, delete_old_snapshots).
- `scripts/seed.ts` — 175 nước + 26 category (đã seed).
- **Vercel cron** (Hobby ≤1 lần/ngày): `vercel.json` sync-ranks `0 3 * * *`,
  sync-metadata `0 4 * * *`.
- **GitHub Actions** `.github/workflows/sync-ranks.yml`: gọi cron mỗi 6h.

## Việc còn lại (cần user)
- [ ] GitHub Actions: set **secrets.CRON_SECRET** = `123456` và **vars.VERCEL_PROD_URL** =
      `appstore-ranking-cuongs-projects-f7638cd4.vercel.app`
      (Repo → Settings → Secrets and variables → Actions). Workflow sẽ tự chạy mỗi 6h.
- [ ] (tuỳ chọn) Supabase Auth: bật Email OTP + thêm Redirect URL của domain prod
      nếu muốn dùng login. Hiện single-user không cần.

## Lưu ý vận hành
- Env vars Vercel: NEXT_PUBLIC_* (non-sensitive), SUPABASE_SERVICE_ROLE_KEY +
  CRON_SECRET (sensitive). Không bao giờ bỏ service role key vào client bundle.
- Vercel project có `framework = nextjs` (bắt buộc, nếu null → edge 404 NOT_FOUND).
- `rank_snapshots` phình to → chạy `delete_old_snapshots(90)` định kỳ.
- Apple không public API số lượt tải → hiển thị Reviews + Ranking score.

## Ghi chú triển khai
- Sự cố trong quá trình deploy: mọi deployment trả `X-Vercel-Error: NOT_FOUND`
  (edge routing không map dù deployment READY/PROMOTED). **Nguyên nhân: project
  `framework: null`**. Fix: `PATCH /v9/projects/{id}` → `{"framework":"nextjs"}`.
- Vercel Hobby giới hạn cron ≤1 lần/ngày → dùng GitHub Actions cho chu kỳ 6h.
