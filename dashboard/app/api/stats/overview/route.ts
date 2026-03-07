import { NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/queries/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getOverviewStats();
    return NextResponse.json(data);
  } catch (err) {
    console.error("overview query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
