"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { LookupApp } from "@/lib/types";

export function SearchApps() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LookupApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error);
        setResults(data.results ?? []);
      } catch (err) {
        setError((err as Error).message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [q]);

  async function track(app: LookupApp) {
    setTracking(String(app.trackId));
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: String(app.trackId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to track");
      toast.success(`Đã lưu ${data.app.name} vào My Apps`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTracking(null);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Nhập tên app hoặc App ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      {error && (
        <div className="text-sm text-destructive">
          Lỗi: {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-muted-foreground">Searching…</div>
      )}
      <div className="space-y-2">
        {results.map((app) => (
          <div
            key={app.trackId}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            {app.artworkUrl100 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.artworkUrl100}
                alt=""
                width={44}
                height={44}
                className="rounded-lg"
              />
            ) : (
              <div className="h-11 w-11 rounded-lg bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={`/app/${app.trackId}`}
                className="block truncate font-medium hover:underline"
              >
                {app.trackName}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{app.artistName}</span>
                <Badge variant="secondary">ID {app.trackId}</Badge>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => track(app)}
              disabled={tracking === String(app.trackId)}
            >
              {tracking === String(app.trackId) ? "Đang lưu…" : "Lưu vào My Apps"}
            </Button>
          </div>
        ))}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Không tìm thấy kết quả.
          </div>
        )}
      </div>
    </div>
  );
}
