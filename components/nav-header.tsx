"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  {
    href: "/my-apps",
    label: "My Apps",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </svg>
    ),
  },
  {
    href: "/explore",
    label: "Charts",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (active: boolean) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2.5" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
];

export function NavHeader() {
  const pathname = usePathname();

  return (
    <>
      {/* Top Header for Desktop */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            maxWidth: "60rem",
            margin: "0 auto",
            padding: "0 1rem",
            height: "3.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href="/explore"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: "1.75rem",
                height: "1.75rem",
                background: "#30d158",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(48,209,88,0.3)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Toplify
            </span>
          </Link>

          {/* Desktop Nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.375rem 0.875rem",
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 500,
                    color: active ? "#ffffff" : "#8e8e93",
                    background: active ? "#2c2c2e" : "transparent",
                    textDecoration: "none",
                    transition: "all 150ms ease",
                  }}
                >
                  {link.icon(active)}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Floating Bottom Bar (Toplify iOS Tab Bar style on Mobile) */}
      <div
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          background: "rgba(44, 44, 46, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "999px",
          padding: "0.375rem 0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {NAV_LINKS.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.375rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.7rem",
                fontWeight: active ? 600 : 500,
                color: active ? "#ffffff" : "#8e8e93",
                background: active ? "#3a3a3c" : "transparent",
                textDecoration: "none",
                transition: "all 150ms ease",
                gap: "2px",
              }}
            >
              {link.icon(active)}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}