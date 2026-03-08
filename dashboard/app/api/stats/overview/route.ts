import { NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/queries/overview";
import { daysRange } from "@/lib/queries/dateRange";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getOverviewStats(daysRange(30));
    return NextResponse.json(data);
  } catch (err) {
    console.error("overview query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
