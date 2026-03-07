import clickhouse from "@/lib/clickhouse";

export interface DailyStats {
  date: string;
  model: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

export async function getDailyStats(days = 30): Promise<DailyStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(date)              AS date,
        model,
        sumMerge(cost_usd_state)   AS cost_usd,
        sumMerge(input_tokens_state)  AS input_tokens,
        sumMerge(output_tokens_state) AS output_tokens
      FROM otel.mv_user_daily_cost_state
      WHERE date >= toDate(now()) - INTERVAL {days:UInt32} DAY
      GROUP BY date, model
      ORDER BY date ASC, model ASC
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    date: string;
    model: string;
    cost_usd: string;
    input_tokens: string;
    output_tokens: string;
  }>();
  return rows.map((r) => ({
    date: r.date,
    model: r.model,
    cost_usd: parseFloat(r.cost_usd),
    input_tokens: parseInt(r.input_tokens),
    output_tokens: parseInt(r.output_tokens),
  }));
}
