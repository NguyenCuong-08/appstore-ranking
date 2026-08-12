import { NextRequest, NextResponse } from "next/server";
import { searchApps } from "@/lib/apple";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const country = params.get("country") || "us";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchApps(q, country);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: "Search failed", detail: (err as Error).message },
      { status: 502 }
    );
  }
}
