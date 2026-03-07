import clickhouse from "@/lib/clickhouse";

export interface SessionSummary {
  session_id: string;
  user_email: string;
  model: string;
  started_at: string;
  ended_at: string;
  event_count: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

export interface SessionEvent {
  timestamp: string;
  event_name: string;
  model: string;
  tool_name: string;
  decision: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  body: string;
}

export async function getRecentSessions(
  limit = 50
): Promise<SessionSummary[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        session_id,
        any(user_email)                                              AS user_email,
        anyIf(model, model != '')                                    AS model,
        toString(min(timestamp))                                     AS started_at,
        toString(max(timestamp))                                     AS ended_at,
        count()                                                      AS event_count,
        sum(cost_usd)                                                AS cost_usd,
        sum(input_tokens)                                            AS input_tokens,
        sum(output_tokens)                                           AS output_tokens
      FROM otel.events
      WHERE session_id != ''
      GROUP BY session_id
      ORDER BY started_at DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { limit },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    session_id: string;
    user_email: string;
    model: string;
    started_at: string;
    ended_at: string;
    event_count: string;
    cost_usd: string;
    input_tokens: string;
    output_tokens: string;
  }>();
  return rows.map((r) => ({
    session_id: r.session_id,
    user_email: r.user_email,
    model: r.model,
    started_at: r.started_at,
    ended_at: r.ended_at,
    event_count: parseInt(r.event_count),
    cost_usd: parseFloat(r.cost_usd),
    input_tokens: parseInt(r.input_tokens),
    output_tokens: parseInt(r.output_tokens),
  }));
}

export async function getSessionEvents(
  sessionId: string
): Promise<SessionEvent[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(timestamp) AS timestamp,
        event_name,
        model,
        tool_name,
        decision,
        input_tokens,
        output_tokens,
        cost_usd,
        body
      FROM otel.events
      WHERE session_id = {sessionId:String}
      ORDER BY timestamp ASC
    `,
    query_params: { sessionId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    timestamp: string;
    event_name: string;
    model: string;
    tool_name: string;
    decision: string;
    input_tokens: string;
    output_tokens: string;
    cost_usd: string;
    body: string;
  }>();
  return rows.map((r) => ({
    timestamp: r.timestamp,
    event_name: r.event_name,
    model: r.model,
    tool_name: r.tool_name,
    decision: r.decision,
    input_tokens: parseInt(r.input_tokens),
    output_tokens: parseInt(r.output_tokens),
    cost_usd: parseFloat(r.cost_usd),
    body: r.body,
  }));
}
