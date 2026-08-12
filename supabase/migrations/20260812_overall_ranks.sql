-- Migration: App ranking theo chart OVERALL (top-free / top-paid), không dùng category
-- Chạy trong Supabase SQL Editor (1 lần).
--
-- Lý do: trước đây rank_snapshots lưu rank theo *category* (category_id = genre của app),
-- khiến "Countries + Top Ranking" trên trang chi tiết app sai. Giờ toàn bộ pipeline
-- (live discovery, cron sync-ranks, history, stats) chỉ dùng chart overall → category_id = null.
--
-- Các RPC cũ filter thêm category_id is null để không đọc lại dữ liệu category cũ.

create or replace function get_latest_ranks(target_app_id uuid)
returns table(
  country_code text,
  chart_type text,
  rank integer,
  captured_at timestamptz
) language sql stable as $$
  select distinct on (rs.country_code, rs.chart_type)
    rs.country_code,
    rs.chart_type,
    rs.rank,
    rs.captured_at
  from rank_snapshots rs
  where rs.app_id = target_app_id
    and rs.category_id is null
  order by rs.country_code, rs.chart_type, rs.captured_at desc;
$$;

create or replace function get_my_apps_stats()
returns table(
  app_id uuid,
  best_rank integer,
  countries_in_top integer,
  last_updated timestamptz
) language sql stable as $$
  select rs.app_id,
    min(rs.rank) filter (where rs.rank is not null) as best_rank,
    count(distinct rs.country_code) filter (where rs.rank <= 200) as countries_in_top,
    max(rs.captured_at) as last_updated
  from rank_snapshots rs
  join tracked_apps ta on ta.app_id = rs.app_id
  where rs.category_id is null
  group by rs.app_id;
$$;

-- OPTIONAL: xoá toàn bộ snapshot rank theo category cũ (dữ liệu rank theo category đã sai
-- so với mục tiêu hiện tại, và sẽ không được dùng nữa). Bỏ comment dòng dưới nếu muốn dọn.
-- delete from rank_snapshots where category_id is not null;
