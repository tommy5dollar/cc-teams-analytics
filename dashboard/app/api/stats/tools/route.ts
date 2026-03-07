import { NextResponse } from "next/server";
import { getToolStats } from "@/lib/queries/tools";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const days = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get("days") ?? "30")));
  try { return NextResponse.json(await getToolStats(days)); }
  catch (err) { console.error(err); return NextResponse.json({ error: "query failed" }, { status: 500 }); }
}
