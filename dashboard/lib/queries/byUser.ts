import clickhouse from "@/lib/clickhouse";
import { type DateRange, DATE_CONDITION, dateParams } from "@/lib/queries/dateRange";

export interface UserStats {
  user_email: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  session_count: number;
  event_count: number;
}

export async function getUserStats(dr: DateRange): Promise<UserStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        user_email,
        sum(cost_usd)                AS cost_usd,
        sum(input_tokens)            AS input_tokens,
        sum(output_tokens)           AS output_tokens,
        sum(cache_read_tokens)       AS cache_read_tokens,
        sum(cache_creation_tokens)   AS cache_creation_tokens,
        uniq(session_id)             AS session_count,
        count()                      AS event_count
      FROM otel.events
      WHERE ${DATE_CONDITION}
        AND user_email <> ''
      GROUP BY user_email
      ORDER BY cost_usd DESC
      LIMIT 100
    `,
    query_params: dateParams(dr),
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    user_email: string;
    cost_usd: string;
    input_tokens: string;
    output_tokens: string;
    cache_read_tokens: string;
    cache_creation_tokens: string;
    session_count: string;
    event_count: string;
  }>();
  return rows.map((r) => ({
    user_email:            r.user_email,
    cost_usd:              parseFloat(r.cost_usd),
    input_tokens:          parseInt(r.input_tokens),
    output_tokens:         parseInt(r.output_tokens),
    cache_read_tokens:     parseInt(r.cache_read_tokens),
    cache_creation_tokens: parseInt(r.cache_creation_tokens),
    session_count:         parseInt(r.session_count),
    event_count:           parseInt(r.event_count),
  }));
}
