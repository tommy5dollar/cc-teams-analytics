import clickhouse from "@/lib/clickhouse";
import { type DateRange, DATE_CONDITION, dateParams } from "@/lib/queries/dateRange";
import type { DailyDimension } from "@/lib/queries/clientInfo";

export interface ModelStats {
  model: string;
  cost_usd: number;
  event_count: number;
}

export async function getModelUsersOverTime(dr: DateRange): Promise<DailyDimension[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(toDate(timestamp)) AS date,
        model                       AS dimension,
        uniq(user_email)            AS users
      FROM otel.events
      WHERE ${DATE_CONDITION}
        AND model <> ''
      GROUP BY date, dimension
      ORDER BY date ASC, users DESC
    `,
    query_params: dateParams(dr),
    format: "JSONEachRow",
  });
  const rows = await result.json<{ date: string; dimension: string; users: string }>();
  return rows.map((r) => ({ date: r.date, dimension: r.dimension, users: parseInt(r.users) }));
}

export async function getModelStats(dr: DateRange): Promise<ModelStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        model,
        sum(cost_usd)  AS cost_usd,
        count()        AS event_count
      FROM otel.events
      WHERE ${DATE_CONDITION}
        AND model <> ''
      GROUP BY model
      ORDER BY cost_usd DESC
    `,
    query_params: dateParams(dr),
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    model: string;
    cost_usd: string;
    event_count: string;
  }>();
  return rows.map((r) => ({
    model:       r.model,
    cost_usd:    parseFloat(r.cost_usd),
    event_count: parseInt(r.event_count),
  }));
}
