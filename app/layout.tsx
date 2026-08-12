import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NavHeader } from "@/components/nav-header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toplify Web — App Store Rank Tracker",
  description:
    "Theo dõi thứ hạng ứng dụng trên App Store theo 175 quốc gia & danh mục. Miễn phí, không cần đăng nhập.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <NavHeader />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-4">{children}</main>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
