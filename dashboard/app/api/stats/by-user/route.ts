import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/queries/byUser";
import { daysRange } from "@/lib/queries/dateRange";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30")));
  try {
    const data = await getUserStats(daysRange(days));
    return NextResponse.json(data);
  } catch (err) {
    console.error("by-user query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
