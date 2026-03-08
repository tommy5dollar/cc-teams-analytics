import { NextRequest, NextResponse } from "next/server";
import { runInferRepos } from "@/lib/jobs/inferRepos";

// POST /api/admin/infer-repos
// Body (optional JSON): { "full": true }  — reprocess all sessions regardless of version
//
// For cron use, call this endpoint with a POST request. Add bearer token
// auth here if exposing publicly, e.g.:
//   if (req.headers.get("Authorization") !== `Bearer ${process.env.ADMIN_TOKEN}`) ...
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const onlyStale = body.full !== true;
    const result = await runInferRepos(onlyStale);
    return NextResponse.json(result);
  } catch (err) {
    console.error("infer-repos job failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
