# App Store Ranking — Next.js + Supabase

Web theo dõi thứ hạng ứng dụng trên App Store theo quốc gia & danh mục.
Single-user, **không cần đăng ký/đăng nhập**. Data lưu trên **Supabase (Postgres)**.
Cron **mỗi 1 giờ** tự fetch rank từ App Store và cập nhật vào DB
(chỉ insert snapshot khi rank thay đổi để tối ưu dung lượng).

> **Lưu ý**: Apple không public API số lượt tải. Trang chi tiết hiển thị
> Rating (sao), số đánh giá (reviews), số nước có mặt trong Top 200, Ranking score
> và bảng top ranking theo từng nước — là các số liệu công khai lấy được.

## Tech stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Supabase**: Postgres (data + lưu trữ)
- **Recharts** (line chart lịch sử rank)
- **Vercel Cron** — mỗi 1h sync rank, mỗi ngày sync metadata

## Cài đặt

1. Cài dependencies:
   ```bash
   npm install
   ```

2. Tạo `.env.local` (copy từ `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://wwihzdwmrvirkqmzonsr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   CRON_SECRET=...
   ```
   Keys lấy từ Supabase → Project Settings → API.

3. **Áp dụng schema (bắt buộc, chạy 1 lần)**: mở
   [Supabase SQL Editor](https://supabase.com/dashboard/project/wwihzdwmrvirkqmzonsr/sql),
   paste toàn bộ nội dung `supabase/schema.sql`, bấm **Run**.

4. Seed countries + categories:
   ```bash
   npx tsx scripts/seed.ts
   ```

5. Chạy dev:
   ```bash
   npm run dev
   ```
   Mở `http://localhost:3000`.

## Cron

- `GET /api/cron/sync-ranks` — **mỗi 1 giờ**, fetch top 200 của các combo
  (country × category × chart) đang được track, ghi vào `rank_snapshots`, check alerts.
- `GET /api/cron/sync-metadata` — mỗi ngày 3h sáng, refresh metadata app qua iTunes Lookup.

Header bắt buộc: `Authorization: Bearer <CRON_SECRET>`.

Test local:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-ranks
```

Cấu hình Vercel Cron trong `vercel.json` (Vercel tự gửi header CRON_SECRET).

## Deploy Vercel

```bash
npx vercel
```
Set 4 env vars trên Vercel Dashboard rồi deploy.

## Cấu trúc

```
app/                # App Router: explore, search, my-apps, app/[appleId], api/...
components/         # shadcn/ui + component nghiệp vụ
lib/                # supabase clients, apple.ts (fetch iTunes/Apple RSS), constants, types
supabase/schema.sql # DDL + functions (chạy thủ công trong SQL Editor 1 lần)
scripts/seed.ts     # seed countries + categories
vercel.json         # cron schedule
```
