/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Lock, Star, Loader2 } from "lucide-react";

interface AppInfo {
  id: string;
  apple_id: string;
  name: string;
  developer: string | null;
  icon_url: string | null;
  price?: number | null;
  rating?: number | null;
  rating_count?: number | null;
}

export function UntrackedAppGate({ app }: { app: AppInfo }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTrackApp = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: app.apple_id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể thêm app vào My Apps");
      }
      // Re-fetch và chuyển trang xem chi tiết app đầy đủ
      router.refresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000000",
        color: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0 1.25rem",
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "#1c1c1e",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Header App Card */}
        <div
          style={{
            background: "#1c1c1e",
            borderRadius: "1.25rem",
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
            border: "1px solid #2c2c2e",
          }}
        >
          <img
            src={app.icon_url || "/placeholder-app.png"}
            alt={app.name}
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "1rem",
              objectFit: "cover",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                margin: 0,
                color: "#ffffff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {app.name}
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#8e8e93",
                margin: "0.25rem 0 0.5rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {app.developer || "Apple Developer"}
            </p>
            {app.rating && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "0.8125rem",
                  color: "#ffcc00",
                }}
              >
                <Star size={14} fill="#ffcc00" color="#ffcc00" />
                <span style={{ fontWeight: 600 }}>{app.rating.toFixed(1)}</span>
                <span style={{ color: "#8e8e93" }}>
                  ({app.rating_count ? app.rating_count.toLocaleString() : 0})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lock Gate Notice Card */}
        <div
          style={{
            background: "linear-gradient(180deg, #1c1c1e 0%, #121214 100%)",
            borderRadius: "1.25rem",
            padding: "2rem 1.5rem",
            textAlign: "center",
            border: "1px solid #2c2c2e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#2c2c2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#30d158",
            }}
          >
            <Lock size={26} />
          </div>

          <div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                margin: "0 0 0.5rem",
                color: "#ffffff",
              }}
            >
              Chưa thêm vào My Apps
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#8e8e93",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Bạn cần thêm <strong style={{ color: "#ffffff" }}>{app.name}</strong> vào danh sách My Apps để xem chi tiết TOP RANKING, Score, Tăng/Hạ rank ở 160+ quốc gia và Lịch sử xếp hạng.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                background: "rgba(255, 69, 58, 0.15)",
                color: "#ff453a",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8125rem",
                width: "100%",
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleTrackApp}
            disabled={loading}
            style={{
              width: "100%",
              background: "#30d158",
              color: "#000000",
              border: "none",
              borderRadius: "0.875rem",
              padding: "0.875rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginTop: "0.5rem",
              opacity: loading ? 0.7 : 1,
              transition: "transform 0.1s ease",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang thêm vào My Apps…</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>Thêm vào My Apps</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
