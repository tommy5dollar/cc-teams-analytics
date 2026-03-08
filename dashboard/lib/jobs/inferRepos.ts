import clickhouse from "@/lib/clickhouse";
import { inferRepo, LOGIC_VERSION } from "@/lib/inferRepo";

export interface InferReposResult {
  sessions_scanned: number;
  sessions_updated: number;
  logic_version: number;
  duration_ms: number;
}

/**
 * Fetches bash commands from otel_logs grouped by session, runs inferRepo on
 * each, and writes results to otel.session_repo.
 *
 * Pass `onlyStale: true` to skip sessions that already have the current
 * logic_version (incremental mode). Pass `onlyStale: false` (default) to
 * reprocess everything — useful after bumping LOGIC_VERSION.
 */
export async function runInferRepos(onlyStale = true): Promise<InferReposResult> {
  const start = Date.now();

  // When running incrementally, first fetch session IDs already at current version
  const upToDateIds = new Set<string>();
  if (onlyStale) {
    const existing = await clickhouse.query({
      query: `SELECT session_id FROM otel.session_repo FINAL WHERE logic_version = {version:UInt8}`,
      query_params: { version: LOGIC_VERSION },
      format: "JSONEachRow",
    });
    const existingRows = await existing.json<{ session_id: string }>();
    for (const r of existingRows) upToDateIds.add(r.session_id);
  }

  const result = await clickhouse.query({
    query: `
      SELECT
        LogAttributes['session.id']                                              AS session_id,
        groupArray(JSONExtractString(LogAttributes['tool_parameters'], 'full_command')) AS bash_commands
      FROM otel.otel_logs
      WHERE LogAttributes['event.name'] = 'tool_result'
        AND LogAttributes['tool_name'] = 'Bash'
        AND JSONExtractString(LogAttributes['tool_parameters'], 'full_command') <> ''
        AND LogAttributes['session.id'] <> ''
      GROUP BY session_id
    `,
    query_params: { version: LOGIC_VERSION },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ session_id: string; bash_commands: string[] }>();

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const toInsert: {
    session_id: string;
    repo: string;
    confidence: string;
    logic_version: number;
    computed_at: string;
  }[] = [];

  const toProcess = rows.filter((r) => !upToDateIds.has(r.session_id));

  for (const { session_id, bash_commands } of toProcess) {
    const guess = inferRepo(bash_commands);
    if (!guess) continue;
    toInsert.push({
      session_id,
      repo: guess.repo,
      confidence: guess.confidence,
      logic_version: LOGIC_VERSION,
      computed_at: now,
    });
  }

  if (toInsert.length > 0) {
    await clickhouse.insert({
      table: "otel.session_repo",
      values: toInsert,
      format: "JSONEachRow",
    });
  }

  return {
    sessions_scanned: toProcess.length,
    sessions_updated: toInsert.length,
    logic_version: LOGIC_VERSION,
    duration_ms: Date.now() - start,
  };
}
