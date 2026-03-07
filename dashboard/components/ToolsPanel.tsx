import type { ToolStats, McpStats } from "@/lib/queries/tools";

function AcceptBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-zinc-500">{rate.toFixed(0)}%</span>
    </div>
  );
}

function ToolTable({ data }: { data: ToolStats[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Tool</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Uses</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Accept rate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {data.map((t) => (
          <tr key={t.tool_name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <td className="px-5 py-2.5 font-mono text-xs text-zinc-800 dark:text-zinc-200">{t.tool_name}</td>
            <td className="px-5 py-2.5 text-right text-xs text-zinc-600 dark:text-zinc-400">{t.uses.toLocaleString()}</td>
            <td className="px-5 py-2.5 text-right">
              {t.accepts + t.rejects > 0 ? <AcceptBar rate={t.accept_rate} /> : <span className="text-xs text-zinc-400">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function McpTable({ data }: { data: McpStats[] }) {
  return data.length === 0 ? (
    <p className="py-10 text-center text-sm text-zinc-400">No MCP tool calls yet</p>
  ) : (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Server</th>
          <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Tool</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Uses</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Accept rate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {data.map((m, i) => (
          <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <td className="px-5 py-2.5 font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">{m.mcp_server_name}</td>
            <td className="px-5 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{m.mcp_tool_name}</td>
            <td className="px-5 py-2.5 text-right text-xs text-zinc-600 dark:text-zinc-400">{m.uses.toLocaleString()}</td>
            <td className="px-5 py-2.5 text-right">
              {m.accepts > 0 ? <AcceptBar rate={m.accept_rate} /> : <span className="text-xs text-zinc-400">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ToolsPanel({ tools, mcpTools }: { tools: ToolStats[]; mcpTools: McpStats[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Built-in tools (30d)</h2>
        </div>
        <div className="overflow-x-auto">
          <ToolTable data={tools} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">MCP tools (30d)</h2>
        </div>
        <div className="overflow-x-auto">
          <McpTable data={mcpTools} />
        </div>
      </div>
    </div>
  );
}
