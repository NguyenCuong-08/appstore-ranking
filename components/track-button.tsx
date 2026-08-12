"use client";

import { useState } from "react";
import { toast } from "sonner";

export function TrackButton({ appId }: { appId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function track() {
    setState("loading");
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: appId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to track");
      toast.success("Added to My Apps");
      setState("done");
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setState("idle");
    }
  }

  return (
    <button
      onClick={track}
      disabled={state !== "idle"}
      style={{
        background: state === "done" ? "oklch(0.65 0.18 165 / 12%)" : "var(--blue)",
        color: state === "done" ? "oklch(0.65 0.18 165)" : "#fff",
        border: "none",
        borderRadius: "999px",
        padding: "0.5rem 1.125rem",
        fontWeight: 600,
        fontSize: "0.875rem",
        cursor: state === "idle" ? "pointer" : "default",
        boxShadow: state === "idle" ? "0 2px 10px rgba(59,130,246,0.3)" : "none",
        transition: "all 150ms ease",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
      }}
    >
      {state === "loading" ? (
        "Adding…"
      ) : state === "done" ? (
        "✓ Tracked"
      ) : (
        <>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
          Track
        </>
      )}
    </button>
  );
}