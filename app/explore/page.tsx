import type { Metadata } from "next";
import { ExploreControls } from "@/components/explore-controls";

export const metadata: Metadata = {
  title: "Explore — Toplify Web",
  description: "Duyệt top chart App Store theo quốc gia và danh mục.",
};

export default function ExplorePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1
            style={{
              fontSize: "1.625rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "oklch(0.97 0 0)",
              margin: 0,
            }}
          >
            Explore
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "oklch(0.56 0.01 250)",
              marginTop: "0.25rem",
            }}
          >
            Top Free &amp; Top Paid charts across 175 countries
          </p>
        </div>
      </div>
      <ExploreControls />
    </div>
  );
}
