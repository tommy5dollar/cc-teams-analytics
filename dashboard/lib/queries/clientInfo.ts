import clickhouse from "@/lib/clickhouse";

export interface ClientInfoStats {
  cc_version: string;
  terminal_type: string;
  os_type: string;
  host_arch: string;
  session_count: number;
  event_count: number;
}

export async function getClientInfo(days = 30): Promise<ClientInfoStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        cc_version,
        terminal_type,
        os_type,
        host_arch,
        uniq(session_id)  AS session_count,
        count()           AS event_count
      FROM otel.events
      WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
        AND cc_version <> ''
      GROUP BY cc_version, terminal_type, os_type, host_arch
      ORDER BY event_count DESC
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    cc_version: string;
    terminal_type: string;
    os_type: string;
    host_arch: string;
    session_count: string;
    event_count: string;
  }>();
  return rows.map((r) => ({
    cc_version: r.cc_version,
    terminal_type: r.terminal_type,
    os_type: r.os_type,
    host_arch: r.host_arch,
    session_count: parseInt(r.session_count),
    event_count: parseInt(r.event_count),
  }));
}
