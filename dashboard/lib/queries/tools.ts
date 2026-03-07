import clickhouse from "@/lib/clickhouse";

export interface ToolStats {
  tool_name: string;
  uses: number;
  accepts: number;
  rejects: number;
  accept_rate: number;
}

export interface McpStats {
  mcp_server_name: string;
  mcp_tool_name: string;
  uses: number;
  accepts: number;
  accept_rate: number;
}

export async function getToolStats(days = 30): Promise<ToolStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        tool_name,
        countIf(event_name = 'tool_result')                                                AS uses,
        countIf(event_name = 'tool_decision' AND decision = 'accept')                      AS accepts,
        countIf(event_name = 'tool_decision' AND decision <> 'accept' AND decision <> '')  AS rejects,
        round(
          countIf(event_name = 'tool_decision' AND decision = 'accept') * 100.0 /
          nullIf(countIf(event_name = 'tool_decision' AND decision <> ''), 0)
        , 1)                                                                                AS accept_rate
      FROM otel.events
      WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
        AND tool_name <> ''
        AND tool_name <> 'mcp_tool'
      GROUP BY tool_name
      ORDER BY uses DESC
      LIMIT 50
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    tool_name: string; uses: string; accepts: string; rejects: string; accept_rate: string | null;
  }>();
  return rows.map((r) => ({
    tool_name: r.tool_name,
    uses: parseInt(r.uses),
    accepts: parseInt(r.accepts),
    rejects: parseInt(r.rejects),
    accept_rate: parseFloat(r.accept_rate ?? "0"),
  }));
}

export async function getMcpStats(days = 30): Promise<McpStats[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        mcp_server_name,
        mcp_tool_name,
        countIf(event_name = 'tool_result')                                                AS uses,
        countIf(event_name = 'tool_decision' AND decision = 'accept')                      AS accepts,
        round(
          countIf(event_name = 'tool_decision' AND decision = 'accept') * 100.0 /
          nullIf(countIf(event_name = 'tool_decision' AND decision <> ''), 0)
        , 1)                                                                                AS accept_rate
      FROM otel.events
      WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
        AND mcp_server_name <> ''
      GROUP BY mcp_server_name, mcp_tool_name
      ORDER BY uses DESC
    `,
    query_params: { days },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    mcp_server_name: string; mcp_tool_name: string; uses: string; accepts: string; accept_rate: string | null;
  }>();
  return rows.map((r) => ({
    mcp_server_name: r.mcp_server_name,
    mcp_tool_name: r.mcp_tool_name,
    uses: parseInt(r.uses),
    accepts: parseInt(r.accepts),
    accept_rate: parseFloat(r.accept_rate ?? "0"),
  }));
}
