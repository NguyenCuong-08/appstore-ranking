export type ChartType = "top-free" | "top-paid" | "top-grossing";

export interface Country {
  code: string;
  name: string;
  region: string | null;
}

export interface Category {
  genre_id: number;
  name: string;
}

export interface App {
  id: string;
  apple_id: string;
  bundle_id: string | null;
  name: string;
  developer: string | null;
  icon_url: string | null;
  primary_category_id: number | null;
  price: number | null;
  rating: number | null;
  rating_count: number | null;
  first_seen_at: string;
  last_metadata_sync_at: string | null;
}

export interface TrackedApp {
  user_id: string;
  app_id: string;
  pinned_countries: string[];
  created_at: string;
}

export interface RankSnapshot {
  id: number;
  app_id: string;
  country_code: string;
  category_id: number;
  chart_type: ChartType;
  rank: number | null;
  captured_at: string;
}

export interface RankAlert {
  id: string;
  user_id: string;
  app_id: string;
  country_code: string;
  chart_type: ChartType;
  threshold_rank: number;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface ChartEntry {
  rank: number;
  id: string;
  name: string;
  developer: string;
  icon: string | null;
  url: string;
}

export interface LookupApp {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string | null;
  primaryGenreId: number | null;
  price: number;
  averageUserRating: number | null;
  userRatingCount: number;
  trackViewUrl: string;
  bundleId: string | null;
}

export interface LatestRank {
  country_code: string;
  chart_type: ChartType;
  rank: number | null;
  prev_rank: number | null; // Rank trước đó để tính thay đổi
  captured_at: string | null;
}

export interface AppWithLatest {
  app: App;
  tracking: boolean;
  pinned_countries: string[];
  latest_ranks: LatestRank[];
}

export interface LatestRankRow {
  country_code: string;
  chart_type: ChartType;
  rank: number | null;
  captured_at: string | null;
}
