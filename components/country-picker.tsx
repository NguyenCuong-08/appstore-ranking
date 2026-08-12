"use client";

import { useState } from "react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/constants";
import { CountryFlag } from "@/components/country-flag";

export function CountryPicker({
  appId,
  initialPinned,
}: {
  appId: string;
  initialPinned: string[];
}) {
  const [pinned, setPinned] = useState<string[]>(initialPinned);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  function toggle(code: string) {
    setPinned((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned_countries: pinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Pinned countries saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = COUNTRIES.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section
      style={{
        background: "oklch(0.16 0.012 250)",
        border: "1px solid oklch(1 0 0 / 7%)",
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "oklch(0.97 0 0)",
            margin: "0 0 0.25rem",
          }}
        >
          Pinned Countries
        </h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "oklch(0.50 0.01 250)",
            margin: "0",
          }}
        >
          Select countries to focus the history chart on.{" "}
          {pinned.length > 0 && (
            <span style={{ color: "var(--blue)", fontWeight: 600 }}>
              {pinned.length} pinned
            </span>
          )}
        </p>
      </div>

      <div style={{ padding: "0.75rem 1.25rem" }}>
        {/* Search */}
        <input
          placeholder="Search country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "oklch(0.20 0.012 250)",
            border: "1px solid oklch(1 0 0 / 8%)",
            borderRadius: "0.5rem",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            color: "oklch(0.96 0 0)",
            outline: "none",
            marginBottom: "0.75rem",
          }}
        />

        {/* Country chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.375rem",
            maxHeight: "180px",
            overflowY: "auto",
          }}
          className="app-list-scroll"
        >
          {filtered.map((c) => {
            const active = pinned.includes(c.code);
            return (
              <button
                key={c.code}
                onClick={() => toggle(c.code)}
                title={c.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.375rem",
                  background: active ? "var(--blue-dim)" : "oklch(0.22 0.012 250)",
                  border: `1px solid ${active ? "rgba(59,130,246,0.35)" : "oklch(1 0 0 / 7%)"}`,
                  color: active ? "var(--blue)" : "oklch(0.65 0.01 250)",
                  fontSize: "0.75rem",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  transition: "all 100ms ease",
                }}
              >
                <CountryFlag code={c.code} width={18} height={13} />
                <span>{c.code}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginTop: "0.875rem",
          }}
        >
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              padding: "0.4375rem 1rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: saving ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
              transition: "opacity 150ms",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {pinned.length > 0 && (
            <button
              onClick={() => setPinned([])}
              style={{
                background: "transparent",
                color: "oklch(0.50 0.01 250)",
                border: "1px solid oklch(1 0 0 / 8%)",
                borderRadius: "999px",
                padding: "0.4375rem 0.875rem",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
