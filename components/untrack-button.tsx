"use client";

import { useState } from "react";
import { toast } from "sonner";

export function UntrackButton({ appId }: { appId: string }) {
  const [loading, setLoading] = useState(false);

  async function untrack() {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to untrack");
      }
      toast.success("Removed from My Apps");
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={untrack}
      disabled={loading}
      style={{
        background: "transparent",
        color: "oklch(0.44 0.01 250)",
        border: "1px solid oklch(1 0 0 / 8%)",
        borderRadius: "0.375rem",
        padding: "0.25rem 0.625rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        cursor: loading ? "wait" : "pointer",
        transition: "all 120ms ease",
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.color = "#ef4444";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
          e.currentTarget.style.background = "rgba(239,68,68,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "oklch(0.44 0.01 250)";
        e.currentTarget.style.borderColor = "oklch(1 0 0 / 8%)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {loading ? (
        "…"
      ) : (
        <>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Remove
        </>
      )}
    </button>
  );
}
