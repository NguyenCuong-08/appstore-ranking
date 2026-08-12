import type { Metadata } from "next";
import { SearchApps } from "@/components/search-apps";

export const metadata: Metadata = {
  title: "Search — Toplify Web",
};

export default function SearchPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
          Search
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "oklch(0.56 0.01 250)",
            marginTop: "0.25rem",
          }}
        >
          Find any app on the App Store and track its rankings
        </p>
      </div>
      <SearchApps />
    </div>
  );
}
