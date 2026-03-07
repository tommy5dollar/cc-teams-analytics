import clickhouse from "@/lib/clickhouse";
import type { DailyDimension } from "@/lib/queries/clientInfo";

export interface ModelStats {
  model: string;
  cost_usd: number;
  event_count: number;
}

export async function getModelUsersOverTime(days = 30): Promise<DailyDimension[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(toDate(timestamp)) AS date,
        model                       AS dimension,
        uniq(user_email)            AS users
      FROM otel.events
      WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
        AND model <> ''
      GROUP BY date, dimension
      ORDER BY date ASC, users DESC
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ date: string; dimension: string; users: string }>();
  return rows.map((r) => ({ date: r.date, dimension: r.dimension, users: parseInt(r.users) }));
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
