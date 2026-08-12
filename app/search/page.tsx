import type { Metadata } from "next";
import { SearchApps } from "@/components/search-apps";

export const metadata: Metadata = {
  title: "Search — App Store Ranking",
};

export default function SearchPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Search App Store</h1>
        <p className="text-muted-foreground">
          Tìm app để track thứ hạng. Nhấn &quot;Track this app&quot; để thêm vào
          dashboard.
        </p>
      </div>
      <SearchApps />
    </div>
  );
}
