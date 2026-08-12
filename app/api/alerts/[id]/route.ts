import { NextRequest, NextResponse } from "next/server";
import { createDbClient } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createDbClient();

  let body: { active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rank_alerts")
    .update({ active: body.active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update alert", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createDbClient();

  const { error } = await supabase.from("rank_alerts").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete alert", detail: error.message },
      { status: 500 }
    );
  }
  return new NextResponse(null, { status: 204 });
}