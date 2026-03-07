import { NextResponse } from "next/server";
import { getRecentSessions } from "@/lib/queries/sessions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  try {
    const data = await getRecentSessions(limit);
    return NextResponse.json(data);
  } catch (err) {
    console.error("sessions query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
