import clickhouse from "@/lib/clickhouse";
import { type DateRange, DATE_CONDITION, dateParams } from "@/lib/queries/dateRange";
import type { ModelStats } from "@/lib/queries/byModel";
import type { ToolStats } from "@/lib/queries/tools";
import type { SessionSummary } from "@/lib/queries/sessions";

export interface UserOverview {
  user_email: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  session_count: number;
  event_count: number;
  first_seen: string;
  last_seen: string;
}

export async function getUserOverview(email: string, dr: DateRange): Promise<UserOverview | null> {
  const result = await clickhouse.query({
    query: `
      SELECT
        user_email,
        sum(cost_usd)              AS cost_usd,
        sum(input_tokens)          AS input_tokens,
        sum(output_tokens)         AS output_tokens,
        sum(cache_read_tokens)     AS cache_read_tokens,
        sum(cache_creation_tokens) AS cache_creation_tokens,
        uniq(session_id)           AS session_count,
        count()                    AS event_count,
        toString(min(timestamp))   AS first_seen,
        toString(max(timestamp))   AS last_seen
      FROM otel.events
      WHERE user_email = {email:String}
        AND ${DATE_CONDITION}
      GROUP BY user_email
    `,
    query_params: { email, ...dateParams(dr) },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    user_email: string; cost_usd: string; input_tokens: string; output_tokens: string;
    cache_read_tokens: string; cache_creation_tokens: string;
    session_count: string; event_count: string; first_seen: string; last_seen: string;
  }>();
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    user_email:            r.user_email,
    cost_usd:              parseFloat(r.cost_usd),
    input_tokens:          parseInt(r.input_tokens),
    output_tokens:         parseInt(r.output_tokens),
    cache_read_tokens:     parseInt(r.cache_read_tokens),
    cache_creation_tokens: parseInt(r.cache_creation_tokens),
    session_count:         parseInt(r.session_count),
    event_count:           parseInt(r.event_count),
    first_seen:            r.first_seen,
    last_seen:             r.last_seen,
  };
}

export interface DailyCostByModel {
  date: string;
  model: string;
  cost_usd: number;
}

export async function getUserCostOverTime(email: string, dr: DateRange): Promise<DailyCostByModel[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(toDate(timestamp)) AS date,
        model,
        sum(cost_usd)               AS cost_usd
      FROM otel.events
      WHERE user_email = {email:String}
        AND ${DATE_CONDITION}
        AND model <> ''
      GROUP BY date, model
      ORDER BY date ASC, cost_usd DESC
    `,
    query_params: { email, ...dateParams(dr) },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ date: string; model: string; cost_usd: string }>();
  return rows.map((r) => ({ date: r.date, model: r.model, cost_usd: parseFloat(r.cost_usd) }));
}

export async function getUserModelStats(email: string, dr: DateRange): Promise<ModelStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        model,
        sum(cost_usd)  AS cost_usd,
        count()        AS event_count
      FROM otel.events
      WHERE user_email = {email:String}
        AND ${DATE_CONDITION}
        AND model <> ''
      GROUP BY model
      ORDER BY cost_usd DESC
    `,
    query_params: { email, ...dateParams(dr) },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ model: string; cost_usd: string; event_count: string }>();
  return rows.map((r) => ({ model: r.model, cost_usd: parseFloat(r.cost_usd), event_count: parseInt(r.event_count) }));
}

export async function getUserToolStats(email: string, dr: DateRange): Promise<ToolStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        tool_name,
        countIf(event_name = 'tool_result')                                                AS uses,
        countIf(event_name = 'tool_decision' AND decision = 'accept')                      AS accepts,
        countIf(event_name = 'tool_decision' AND decision <> 'accept' AND decision <> '')  AS rejects,
        round(
          countIf(event_name = 'tool_decision' AND decision = 'accept') * 100.0 /
          nullIf(countIf(event_name = 'tool_decision' AND decision <> ''), 0)
        , 1)                                                                                AS accept_rate
      FROM otel.events
      WHERE user_email = {email:String}
        AND ${DATE_CONDITION}
        AND tool_name <> ''
        AND tool_name <> 'mcp_tool'
      GROUP BY tool_name
      ORDER BY uses DESC
      LIMIT 30
    `,
    query_params: { email, ...dateParams(dr) },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    tool_name: string; uses: string; accepts: string; rejects: string; accept_rate: string | null;
  }>();
  return rows.map((r) => ({
    tool_name:   r.tool_name,
    uses:        parseInt(r.uses),
    accepts:     parseInt(r.accepts),
    rejects:     parseInt(r.rejects),
    accept_rate: parseFloat(r.accept_rate ?? "0"),
  }));
}

export async function getUserSessions(email: string, dr: DateRange, limit = 100): Promise<SessionSummary[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        session_id,
        {email:String}                                AS user_email,
        groupUniqArrayIf(model, model <> '')          AS models,
        toString(min(timestamp))                      AS started_at,
        toString(max(timestamp))                      AS ended_at,
        count()                                       AS event_count,
        sum(cost_usd)                                 AS cost_usd,
        sum(input_tokens)                             AS input_tokens,
        sum(output_tokens)                            AS output_tokens
      FROM otel.events
      WHERE user_email = {email:String}
        AND ${DATE_CONDITION}
        AND session_id <> ''
      GROUP BY session_id
      ORDER BY started_at DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { email, ...dateParams(dr), limit },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    session_id: string; user_email: string; models: string[];
    started_at: string; ended_at: string;
    event_count: string; cost_usd: string; input_tokens: string; output_tokens: string;
  }>();
  return rows.map((r) => ({
    session_id:   r.session_id,
    user_email:   r.user_email,
    models:       r.models,
    started_at:   r.started_at,
    ended_at:     r.ended_at,
    event_count:  parseInt(r.event_count),
    cost_usd:     parseFloat(r.cost_usd),
    input_tokens: parseInt(r.input_tokens),
    output_tokens: parseInt(r.output_tokens),
  }));
}
