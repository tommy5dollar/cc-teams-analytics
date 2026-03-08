import { NextRequest, NextResponse } from "next/server";
import { runSessionLinks } from "@/lib/jobs/sessionLinks";

// POST /api/admin/session-links
// Body (optional JSON): { "full": true }  — recompute all links
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const onlyNew = body.full !== true;
    const result = await runSessionLinks(onlyNew);
    return NextResponse.json(result);
  } catch (err) {
    console.error("session-links job failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
