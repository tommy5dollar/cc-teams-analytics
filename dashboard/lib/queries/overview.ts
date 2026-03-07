import clickhouse from "@/lib/clickhouse";

export interface OverviewStats {
  costThisMonth: number;
  costLastMonth: number;
  totalTokens: number;
  activeUsers: number;
  sessionCount: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const result = await clickhouse.query({
    query: `
      SELECT
        sumIf(cost_usd, toYYYYMM(timestamp) = toYYYYMM(now()))         AS cost_this_month,
        sumIf(cost_usd, toYYYYMM(timestamp) = toYYYYMM(now() - INTERVAL 1 MONTH)) AS cost_last_month,
        sum(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens) AS total_tokens,
        uniqIf(user_email, toYYYYMM(timestamp) = toYYYYMM(now()))      AS active_users,
        uniqIf(session_id, toYYYYMM(timestamp) = toYYYYMM(now()))      AS session_count
      FROM otel.events
    `,
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    cost_this_month: string;
    cost_last_month: string;
    total_tokens: string;
    active_users: string;
    session_count: string;
  }>();
  const row = rows[0] ?? {
    cost_this_month: "0",
    cost_last_month: "0",
    total_tokens: "0",
    active_users: "0",
    session_count: "0",
  };
  return {
    costThisMonth: parseFloat(row.cost_this_month),
    costLastMonth: parseFloat(row.cost_last_month),
    totalTokens: parseInt(row.total_tokens),
    activeUsers: parseInt(row.active_users),
    sessionCount: parseInt(row.session_count),
  };
}
