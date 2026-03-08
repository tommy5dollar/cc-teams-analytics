"use client";

import { useState } from "react";
import type { McpStats, SkillStats } from "@/lib/queries/tools";

function AcceptBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-zinc-500">{rate.toFixed(0)}%</span>
    </div>
  );
}


interface ServerGroup {
  server: string;
  totalUses: number;
  acceptRate: number;
  tools: McpStats[];
}

function groupByServer(data: McpStats[]): ServerGroup[] {
  const map = new Map<string, { uses: number; accepts: number; decisions: number; tools: McpStats[] }>();
  for (const m of data) {
    if (!map.has(m.mcp_server_name)) map.set(m.mcp_server_name, { uses: 0, accepts: 0, decisions: 0, tools: [] });
    const g = map.get(m.mcp_server_name)!;
    g.uses += m.uses;
    g.accepts += m.accepts;
    g.decisions += m.accepts + (m.uses - m.accepts); // approximate
    g.tools.push(m);
  }
  return Array.from(map.entries())
    .map(([server, g]) => ({
      server,
      totalUses: g.uses,
      acceptRate: g.decisions > 0 ? (g.accepts / g.decisions) * 100 : 0,
      tools: g.tools.sort((a, b) => b.uses - a.uses),
    }))
    .sort((a, b) => b.totalUses - a.totalUses);
}

function McpGrouped({ data }: { data: McpStats[] }) {
  const groups = groupByServer(data);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-400">No MCP tool calls yet</p>;
  }

  function toggle(server: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(server)) { next.delete(server); } else { next.add(server); }
      return next;
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Server</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Uses</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Accept rate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {groups.map((g) => {
          const open = expanded.has(g.server);
          return (
            <>
              <tr
                key={g.server}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                onClick={() => toggle(g.server)}
              >
                <td className="px-5 py-2.5 font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  <span className="mr-2 text-zinc-400">{open ? "▾" : "▸"}</span>
                  {g.server}
                  <span className="ml-2 text-zinc-400">({g.tools.length})</span>
                </td>
                <td className="px-5 py-2.5 text-right text-xs text-zinc-600 dark:text-zinc-400">
                  {g.totalUses.toLocaleString()}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {g.acceptRate > 0 ? <AcceptBar rate={g.acceptRate} /> : <span className="text-xs text-zinc-400">—</span>}
                </td>
              </tr>
              {open && g.tools.map((t) => (
                <tr key={`${g.server}/${t.mcp_tool_name}`} className="bg-zinc-50/60 dark:bg-zinc-800/30">
                  <td className="py-2 pl-12 pr-5 text-xs text-zinc-600 dark:text-zinc-400">{t.mcp_tool_name || "—"}</td>
                  <td className="px-5 py-2 text-right text-xs text-zinc-500">{t.uses.toLocaleString()}</td>
                  <td className="px-5 py-2 text-right">
                    {t.accepts > 0 ? <AcceptBar rate={t.accept_rate} /> : <span className="text-xs text-zinc-400">—</span>}
                  </td>
                </tr>
              ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ToolsPanel({ mcpTools, skills }: { mcpTools: McpStats[]; skills: SkillStats[] }) {
  const totalSkillUses = skills.reduce((s, r) => s + r.uses, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Skills invoked</h2>
        </div>
        {skills.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">No skills invoked yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Skill</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Uses</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {skills.map((s) => (
                <tr key={s.skill_name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-2.5 font-mono text-xs text-zinc-800 dark:text-zinc-200">{s.skill_name}</td>
                  <td className="px-5 py-2.5 text-right text-xs text-zinc-600 dark:text-zinc-400">{s.uses.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(s.uses / totalSkillUses) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs text-zinc-500">
                        {((s.uses / totalSkillUses) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">MCP tools</h2>
        </div>
        <div className="overflow-x-auto">
          <McpGrouped data={mcpTools} />
        </div>
      </div>
    </div>
  );
}
