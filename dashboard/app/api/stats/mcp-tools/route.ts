import { NextResponse } from "next/server";
import { getMcpStats } from "@/lib/queries/tools";
import { daysRange } from "@/lib/queries/dateRange";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const days = Math.min(365, Math.max(1, parseInt(new URL(req.url).searchParams.get("days") ?? "30")));
  try { return NextResponse.json(await getMcpStats(daysRange(days))); }
  catch (err) { console.error(err); return NextResponse.json({ error: "query failed" }, { status: 500 }); }
}
