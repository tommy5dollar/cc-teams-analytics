import clickhouse from "@/lib/clickhouse";

export interface ModelStats {
  model: string;
  cost_usd: number;
  event_count: number;
}

export async function getModelStats(days = 30): Promise<ModelStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        model,
        sumMerge(cost_usd_state)      AS cost_usd,
        countMerge(event_count_state) AS event_count
      FROM otel.mv_model_usage_state
      WHERE date >= toDate(now()) - INTERVAL {days:UInt32} DAY
        AND model != ''
      GROUP BY model
      ORDER BY cost_usd DESC
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    model: string;
    cost_usd: string;
    event_count: string;
  }>();
  return rows.map((r) => ({
    model: r.model,
    cost_usd: parseFloat(r.cost_usd),
    event_count: parseInt(r.event_count),
  }));
}
