import clickhouse from "@/lib/clickhouse";
import { type DateRange, DATE_CONDITION, dateParams } from "@/lib/queries/dateRange";

export interface ClientInfoStats {
  cc_version: string;
  terminal_type: string;
  os_type: string;
  host_arch: string;
  session_count: number;
  event_count: number;
}

export interface DailyDimension {
  date: string;
  dimension: string;
  users: number;
}

export async function getClientInfo(dr: DateRange): Promise<ClientInfoStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        cc_version, terminal_type, os_type, host_arch,
        uniq(session_id) AS session_count,
        count()          AS event_count
      FROM otel.events
      WHERE ${DATE_CONDITION}
        AND cc_version <> ''
      GROUP BY cc_version, terminal_type, os_type, host_arch
      ORDER BY event_count DESC
    `,
    query_params: dateParams(dr),
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    cc_version: string; terminal_type: string; os_type: string;
    host_arch: string; session_count: string; event_count: string;
  }>();
  return rows.map((r) => ({
    cc_version:    r.cc_version,
    terminal_type: r.terminal_type,
    os_type:       r.os_type,
    host_arch:     r.host_arch,
    session_count: parseInt(r.session_count),
    event_count:   parseInt(r.event_count),
  }));
}

export async function getVersionOverTime(dr: DateRange): Promise<DailyDimension[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        toString(toDate(timestamp)) AS date,
        cc_version                  AS dimension,
        uniq(user_email)            AS users
      FROM otel.events
      WHERE ${DATE_CONDITION}
        AND cc_version <> ''
      GROUP BY date, dimension
      ORDER BY date ASC, users DESC
    `,
    query_params: dateParams(dr),
    format: "JSONEachRow",
  });
  const rows = await result.json<{ date: string; dimension: string; users: string }>();
  return rows.map((r) => ({ date: r.date, dimension: r.dimension, users: parseInt(r.users) }));
}
