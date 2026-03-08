import clickhouse from "@/lib/clickhouse";
import { type DateRange, DATE_CONDITION, dateParams } from "@/lib/queries/dateRange";

export interface SessionSummary {
  session_id: string;
  user_email: string;
  models: string[];
  started_at: string;
  ended_at: string;
  event_count: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

export interface SessionModelCost {
  model: string;
  cost_usd: number;
  api_calls: number;
}

export interface SessionEvent {
  timestamp: string;
  sequence: number;
  prompt_id: string;
  event_name: string;
  model: string;
  tool_name: string;
  decision: string;
  decision_source: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cost_usd: number;
  duration_ms: number | null;
  success: boolean | null;
  tool_result_size_bytes: number | null;
  tool_description: string;   // extracted from tool_parameters.description
  bash_command: string;       // extracted from tool_parameters.full_command (Bash only)
  prompt_length: number | null;
  error: string;
  status_code: string;
  attempt: number | null;
}

export async function getSessionRepos(sessionIds: string[]): Promise<Map<string, string>> {
  if (sessionIds.length === 0) return new Map();
  const result = await clickhouse.query({
    query: `
      SELECT session_id, repo
      FROM otel.session_repo FINAL
      WHERE session_id IN ({sessionIds:Array(String)})
    `,
    query_params: { sessionIds },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ session_id: string; repo: string }>();
  return new Map(rows.map((r) => [r.session_id, r.repo]));
}

export async function getRecentSessions(dr: DateRange, limit = 50): Promise<SessionSummary[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        session_id,
        any(user_email)                                   AS user_email,
        groupUniqArrayIf(model, model <> '')              AS models,
        toString(min(timestamp))                          AS started_at,
        toString(max(timestamp))                          AS ended_at,
        count()                                           AS event_count,
        sum(cost_usd)                                     AS cost_usd,
        sum(input_tokens)                                 AS input_tokens,
        sum(output_tokens)                                AS output_tokens
      FROM otel.events
      WHERE ${DATE_CONDITION}
        AND session_id <> ''
      GROUP BY session_id
      ORDER BY started_at DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { ...dateParams(dr), limit },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    session_id: string;
    user_email: string;
    models: string[];
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
    models: r.models,
    started_at: r.started_at,
    ended_at: r.ended_at,
    event_count: parseInt(r.event_count),
    cost_usd: parseFloat(r.cost_usd),
    input_tokens: parseInt(r.input_tokens),
    output_tokens: parseInt(r.output_tokens),
  }));
}

export async function getSessionModelBreakdown(sessionId: string): Promise<SessionModelCost[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        model,
        sum(cost_usd)  AS cost_usd,
        count()        AS api_calls
      FROM otel.events
      WHERE session_id = {sessionId:String}
        AND model <> ''
      GROUP BY model
      ORDER BY cost_usd DESC
    `,
    query_params: { sessionId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ model: string; cost_usd: string; api_calls: string }>();
  return rows.map((r) => ({
    model: r.model,
    cost_usd: parseFloat(r.cost_usd),
    api_calls: parseInt(r.api_calls),
  }));
}

export async function getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(Timestamp)                                                       AS timestamp,
        toUInt32OrZero(LogAttributes['event.sequence'])                           AS sequence,
        LogAttributes['prompt.id']                                                AS prompt_id,
        LogAttributes['event.name']                                               AS event_name,
        LogAttributes['model']                                                    AS model,
        LogAttributes['tool_name']                                                AS tool_name,
        LogAttributes['decision']                                                 AS decision,
        LogAttributes['decision_source']                                          AS decision_source,
        toUInt32OrZero(LogAttributes['input_tokens'])                             AS input_tokens,
        toUInt32OrZero(LogAttributes['output_tokens'])                            AS output_tokens,
        toUInt32OrZero(LogAttributes['cache_read_tokens'])                        AS cache_read_tokens,
        toUInt32OrZero(LogAttributes['cache_creation_tokens'])                    AS cache_creation_tokens,
        toFloat64OrZero(LogAttributes['cost_usd'])                                AS cost_usd,
        if(LogAttributes['duration_ms'] != '', toUInt32OrZero(LogAttributes['duration_ms']), NULL) AS duration_ms,
        if(LogAttributes['success'] != '', LogAttributes['success'] = 'true', NULL)                AS success,
        if(LogAttributes['tool_result_size_bytes'] != '', toUInt32OrZero(LogAttributes['tool_result_size_bytes']), NULL) AS tool_result_size_bytes,
        JSONExtractString(LogAttributes['tool_parameters'], 'description')        AS tool_description,
        JSONExtractString(LogAttributes['tool_parameters'], 'full_command')       AS bash_command,
        if(LogAttributes['prompt_length'] != '', toUInt32OrZero(LogAttributes['prompt_length']), NULL) AS prompt_length,
        LogAttributes['error']                                                    AS error,
        LogAttributes['status_code']                                              AS status_code,
        if(LogAttributes['attempt'] != '', toUInt32OrZero(LogAttributes['attempt']), NULL)          AS attempt,
        Body                                                                      AS body
      FROM otel.otel_logs
      WHERE LogAttributes['session.id'] = {sessionId:String}
      ORDER BY sequence ASC, Timestamp ASC
    `,
    query_params: { sessionId },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    timestamp: string; sequence: string; prompt_id: string; event_name: string;
    model: string; tool_name: string; decision: string; decision_source: string;
    input_tokens: string; output_tokens: string; cache_read_tokens: string; cache_creation_tokens: string;
    cost_usd: string; duration_ms: number | null; success: boolean | null;
    tool_result_size_bytes: number | null; tool_description: string; bash_command: string;
    prompt_length: number | null; error: string; status_code: string; attempt: number | null; body: string;
  }>();
  return rows.map((r) => ({
    timestamp:             r.timestamp,
    sequence:              parseInt(r.sequence),
    prompt_id:             r.prompt_id,
    event_name:            r.event_name,
    model:                 r.model,
    tool_name:             r.tool_name,
    decision:              r.decision,
    decision_source:       r.decision_source,
    input_tokens:          parseInt(r.input_tokens),
    output_tokens:         parseInt(r.output_tokens),
    cache_read_tokens:     parseInt(r.cache_read_tokens),
    cache_creation_tokens: parseInt(r.cache_creation_tokens),
    cost_usd:              parseFloat(r.cost_usd),
    duration_ms:           r.duration_ms,
    success:               r.success,
    tool_result_size_bytes: r.tool_result_size_bytes,
    tool_description:      r.tool_description,
    bash_command:          r.bash_command,
    prompt_length:         r.prompt_length,
    error:                 r.error,
    status_code:           r.status_code,
    attempt:               r.attempt,
  }));
}
