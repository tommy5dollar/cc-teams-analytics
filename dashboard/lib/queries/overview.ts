import clickhouse from "@/lib/clickhouse";
import { type DateRange, DATE_CONDITION, dateParams, priorRange } from "@/lib/queries/dateRange";

export interface OverviewStats {
  costInRange: number;
  costPriorRange: number;
  totalTokens: number;
  activeUsers: number;
  sessionCount: number;
}

export async function getOverviewStats(dr: DateRange): Promise<OverviewStats> {
  const prior = priorRange(dr);

  const result = await clickhouse.query({
    query: `
      SELECT
        sumIf(cost_usd, ${DATE_CONDITION})                                                AS cost_in_range,
        sumIf(cost_usd, timestamp >= toDateTime({pr_from:String}) AND timestamp < toDateTime({pr_to:String}) + INTERVAL 1 DAY) AS cost_prior_range,
        sumIf(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens, ${DATE_CONDITION}) AS total_tokens,
        uniqIf(user_email, ${DATE_CONDITION})                                             AS active_users,
        uniqIf(session_id, ${DATE_CONDITION})                                             AS session_count
      FROM otel.events
    `,
    query_params: { ...dateParams(dr), pr_from: prior.from, pr_to: prior.to },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    cost_in_range: string;
    cost_prior_range: string;
    total_tokens: string;
    active_users: string;
    session_count: string;
  }>();
  const row = rows[0] ?? {
    cost_in_range: "0", cost_prior_range: "0",
    total_tokens: "0", active_users: "0", session_count: "0",
  };
  return {
    costInRange:    parseFloat(row.cost_in_range),
    costPriorRange: parseFloat(row.cost_prior_range),
    totalTokens:    parseInt(row.total_tokens),
    activeUsers:    parseInt(row.active_users),
    sessionCount:   parseInt(row.session_count),
  };
}
