import clickhouse from "@/lib/clickhouse";

export interface SessionLinksResult {
  prompt_ids_scanned: number;
  links_found: number;
  links_written: number;
  duration_ms: number;
}

interface SessionPromptRow {
  prompt_id: string;
  session_id: string;
  first_event_at: string;
}

/**
 * Finds sessions that share a prompt.id — which indicates one was resumed from
 * the other — and writes parent→child edges to otel.session_links.
 *
 * Pass `onlyNew: true` to skip prompt_ids already represented in session_links.
 * Pass `onlyNew: false` to recompute all links (e.g. after schema changes).
 */
export async function runSessionLinks(onlyNew = true): Promise<SessionLinksResult> {
  const start = Date.now();

  // Fetch prompt_ids already covered when running incrementally
  const coveredPromptIds = new Set<string>();
  if (onlyNew) {
    const existing = await clickhouse.query({
      query: `SELECT DISTINCT via_prompt_id FROM otel.session_links FINAL`,
      format: "JSONEachRow",
    });
    const existingRows = await existing.json<{ via_prompt_id: string }>();
    for (const r of existingRows) coveredPromptIds.add(r.via_prompt_id);
  }

  // All (session_id, prompt_id) pairs — one row per unique combination
  const result = await clickhouse.query({
    query: `
      SELECT
        LogAttributes['prompt.id']   AS prompt_id,
        LogAttributes['session.id']  AS session_id,
        toString(min(Timestamp))     AS first_event_at
      FROM otel.otel_logs
      WHERE LogAttributes['prompt.id']  <> ''
        AND LogAttributes['session.id'] <> ''
      GROUP BY prompt_id, session_id
    `,
    format: "JSONEachRow",
  });

  const rows = await result.json<SessionPromptRow>();

  // Group by prompt_id
  const byPrompt = new Map<string, { session_id: string; first_event_at: string }[]>();
  for (const r of rows) {
    if (coveredPromptIds.has(r.prompt_id)) continue;
    const existing = byPrompt.get(r.prompt_id);
    if (existing) {
      existing.push({ session_id: r.session_id, first_event_at: r.first_event_at });
    } else {
      byPrompt.set(r.prompt_id, [{ session_id: r.session_id, first_event_at: r.first_event_at }]);
    }
  }

  // Only prompt_ids shared by >1 session are resume links
  const linkedPrompts = [...byPrompt.entries()].filter(([, sessions]) => sessions.length > 1);

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const toInsert: {
    session_id: string;
    parent_session_id: string;
    via_prompt_id: string;
    computed_at: string;
  }[] = [];

  for (const [prompt_id, sessions] of linkedPrompts) {
    // Sort by first event to establish temporal order
    sessions.sort((a, b) => a.first_event_at.localeCompare(b.first_event_at));

    // Create parent→child edge for each consecutive pair
    for (let i = 1; i < sessions.length; i++) {
      toInsert.push({
        session_id:        sessions[i].session_id,
        parent_session_id: sessions[i - 1].session_id,
        via_prompt_id:     prompt_id,
        computed_at:       now,
      });
    }
  }

  if (toInsert.length > 0) {
    await clickhouse.insert({
      table: "otel.session_links",
      values: toInsert,
      format: "JSONEachRow",
    });
  }

  return {
    prompt_ids_scanned: linkedPrompts.length,
    links_found:        toInsert.length,
    links_written:      toInsert.length,
    duration_ms:        Date.now() - start,
  };
}
