import type { Metadata } from "next";
import { ExploreControls } from "@/components/explore-controls";

export const metadata: Metadata = {
  title: "Explore — App Store Ranking",
  description: "Duyệt top chart App Store theo quốc gia và danh mục.",
};

export default function ExplorePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-muted-foreground">
          Xem thứ hạng ứng dụng trên App Store theo quốc gia &amp; danh mục.
        </p>
      </div>
      <ExploreControls />
    </div>
  );
}
