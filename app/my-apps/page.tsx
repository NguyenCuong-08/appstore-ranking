import type { Metadata } from "next";
import Link from "next/link";
import { createDbClient } from "@/lib/supabase/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UntrackButton } from "@/components/untrack-button";
import type { App } from "@/lib/types";

export const metadata: Metadata = {
  title: "My Apps — App Store Ranking",
};

export const dynamic = "force-dynamic";

interface AppStats {
  app_id: string;
  best_rank: number | null;
  countries_in_top: number;
  last_updated: string | null;
}

export default async function MyAppsPage() {
  const supabase = createDbClient();

  const { data: tracked } = await supabase
    .from("tracked_apps")
    .select("app_id");

  if (!tracked || tracked.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">My Apps</h1>
          <p className="text-muted-foreground">
            Lưu app yêu thích để theo dõi thứ hạng. Chưa có app nào.
          </p>
        </div>
        <Button asChild>
          <Link href="/search">Tìm app để lưu</Link>
        </Button>
      </div>
    );
  }

  const appIds = tracked.map((t) => t.app_id);

  const [{ data: apps }, { data: statsRaw }] = await Promise.all([
    supabase.from("apps").select("*").in("id", appIds),
    supabase.rpc("get_my_apps_stats"),
  ]);

  const statsById = new Map(
    ((statsRaw ?? []) as AppStats[]).map((s) => [s.app_id, s])
  );

  const rows = ((apps ?? []) as App[])
    .map((app) => {
      const s = statsById.get(app.id);
      return {
        app,
        bestRank: s?.best_rank ?? null,
        countriesInTop: s?.countries_in_top ?? 0,
        lastUpdated: s?.last_updated ?? null,
      };
    })
    .sort((a, b) => (a.bestRank ?? 999) - (b.bestRank ?? 999));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Apps</h1>
          <p className="text-muted-foreground">
            Các app yêu thích đang theo dõi. Cập nhật mỗi 1 giờ.
          </p>
        </div>
        <Button asChild>
          <Link href="/search">+ Add app</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ app, bestRank, countriesInTop, lastUpdated }) => (
          <div key={app.id} className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {app.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={app.icon_url}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/app/${app.apple_id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {app.name}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {app.developer}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Badge
                variant={
                  bestRank && bestRank <= 3 ? "default" : "secondary"
                }
              >
                Best rank: {bestRank ?? "—"}
              </Badge>
              <Badge variant="outline">Top 200: {countriesInTop} nước</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {lastUpdated
                ? `Last updated ${new Date(lastUpdated).toLocaleString()}`
                : "Chưa có dữ liệu rank (chờ cron sync)"}
            </div>
            <div className="mt-3 flex justify-end">
              <UntrackButton appId={app.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}