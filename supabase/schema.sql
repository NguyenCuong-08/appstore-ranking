-- Phase 2 schema — App Store Ranking (single-user, không auth)
-- Chạy trong Supabase SQL Editor (1 lần)

create extension if not exists pgcrypto;

-- Quyền cho anon (web) + service_role (cron/seed)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Reference tables (seed riêng qua scripts/seed.ts)
create table if not exists countries (
  code text primary key,
  name text not null,
  region text
);

create table if not exists categories (
  genre_id integer primary key,
  name text not null
);

-- Apps được track
create table if not exists apps (
  id uuid primary key default gen_random_uuid(),
  apple_id text not null unique,
  bundle_id text,
  name text not null,
  developer text,
  icon_url text,
  primary_category_id integer references categories(genre_id),
  price numeric default 0,
  rating numeric,
  rating_count integer,
  first_seen_at timestamptz default now(),
  last_metadata_sync_at timestamptz,
  updated_at timestamptz default now()
);

-- App đang track (single-user: không cần user_id)
create table if not exists tracked_apps (
  app_id uuid primary key references apps(id) on delete cascade,
  pinned_countries text[] default '{}',
  created_at timestamptz default now()
);

-- Time-series rank snapshots
create table if not exists rank_snapshots (
  id bigint generated always as identity primary key,
  app_id uuid references apps(id) on delete cascade,
  country_code text references countries(code),
  category_id integer references categories(genre_id),
  chart_type text check (chart_type in ('top-free','top-paid','top-grossing')),
  rank integer,
  captured_at timestamptz default now()
);
create index if not exists idx_rank_snapshots_lookup
  on rank_snapshots (app_id, country_code, chart_type, captured_at desc);
create index if not exists idx_rank_snapshots_combo
  on rank_snapshots (country_code, category_id, chart_type, captured_at desc);
create index if not exists idx_rank_snapshots_app_time
  on rank_snapshots (app_id, captured_at desc);

-- Rank alerts
create table if not exists rank_alerts (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id) on delete cascade,
  country_code text references countries(code),
  chart_type text check (chart_type in ('top-free','top-paid','top-grossing')),
  threshold_rank integer,
  active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_rank_alerts_app on rank_alerts (app_id);

-- Reviews (Sprint sau)
create table if not exists app_reviews (
  id bigint generated always as identity primary key,
  app_id uuid references apps(id) on delete cascade,
  country_code text,
  author text,
  rating integer,
  title text,
  body text,
  review_date timestamptz,
  fetched_at timestamptz default now()
);

-- Function: lấy combo (country, category) cần fetch rank từ chart Apple
create or replace function get_needed_chart_combos()
returns table(country_code text, category_id integer) language sql stable as $$
  select distinct unnest(ta.pinned_countries) as country_code, a.primary_category_id as category_id
  from tracked_apps ta
  join apps a on a.id = ta.app_id
  where a.primary_category_id is not null
    and array_length(ta.pinned_countries, 1) > 0;
$$;

-- Function: rank mới nhất cho từng (country, chart_type) của 1 app
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
  order by rs.country_code, rs.chart_type, rs.captured_at desc;
$$;

-- Function: stats tổng hợp cho dashboard (1 query)
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
  group by rs.app_id;
$$;

-- Function: xoá snapshot cũ (dọn dữ liệu)
create or replace function delete_old_snapshots(days int default 90)
returns int language plpgsql as $$
  declare n int;
  begin
    delete from rank_snapshots where captured_at < now() - (days || ' days')::interval;
    get diagnostics n = row_count;
    return n;
  end;
$$;
