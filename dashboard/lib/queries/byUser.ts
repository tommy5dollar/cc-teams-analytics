import clickhouse from "@/lib/clickhouse";

export interface UserStats {
  user_email: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  session_count: number;
  event_count: number;
}

export async function getUserStats(days = 30): Promise<UserStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        user_email,
        sumMerge(cost_usd_state)      AS cost_usd,
        sumMerge(input_tokens_state)  AS input_tokens,
        sumMerge(output_tokens_state) AS output_tokens,
        countMerge(event_count_state) AS event_count
      FROM otel.mv_user_daily_cost_state
      WHERE date >= toDate(now()) - INTERVAL {days:UInt32} DAY
        AND user_email != ''
      GROUP BY user_email
      ORDER BY cost_usd DESC
      LIMIT 100
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    user_email: string;
    cost_usd: string;
    input_tokens: string;
    output_tokens: string;
    event_count: string;
  }>();
  // session_count requires hitting the raw events table
  const emails = rows.map((r) => `'${r.user_email.replace(/'/g, "''")}'`);
  const sessionMap: Record<string, number> = {};
  if (emails.length > 0) {
    const sessionResult = await clickhouse.query({
      query: `
        SELECT user_email, uniq(session_id) AS session_count
        FROM otel.events
        WHERE user_email IN (${emails.join(",")})
          AND timestamp >= now() - INTERVAL {days:UInt32} DAY
        GROUP BY user_email
      `,
      query_params: { days },
      format: "JSONEachRow",
    });
    const sessionRows = await sessionResult.json<{
      user_email: string;
      session_count: string;
    }>();
    for (const r of sessionRows) {
      sessionMap[r.user_email] = parseInt(r.session_count);
    }
  }
  return rows.map((r) => ({
    user_email: r.user_email,
    cost_usd: parseFloat(r.cost_usd),
    input_tokens: parseInt(r.input_tokens),
    output_tokens: parseInt(r.output_tokens),
    session_count: sessionMap[r.user_email] ?? 0,
    event_count: parseInt(r.event_count),
  }));
}
