import { NextResponse } from "next/server";
import { getClientInfo } from "@/lib/queries/clientInfo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30")));
  try {
    const data = await getClientInfo(days);
    return NextResponse.json(data);
  } catch (err) {
    console.error("client-info query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
