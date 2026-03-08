import { NextResponse } from "next/server";
import { getClientInfo } from "@/lib/queries/clientInfo";
import { daysRange } from "@/lib/queries/dateRange";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30")));
  try {
    const data = await getClientInfo(daysRange(days));
    return NextResponse.json(data);
  } catch (err) {
    console.error("client-info query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
