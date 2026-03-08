"use client";

import * as Tabs from "@radix-ui/react-tabs";
import AdoptionChart from "@/components/AdoptionChart";
import type { ClientInfoStats, DailyDimension } from "@/lib/queries/clientInfo";
import clsx from "clsx";

function SimpleTable({
  rows,
  cols,
}: {
  rows: Record<string, string | number>[];
  cols: { key: string; label: string; mono?: boolean }[];
}) {
  const total = rows.reduce((s, r) => s + Number(r.event_count ?? 0), 0);
  return rows.length === 0 ? (
    <p className="py-10 text-center text-sm text-zinc-400">No data</p>
  ) : (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-100 dark:border-zinc-800">
          {cols.map((c) => (
            <th key={c.key} className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">
              {c.label}
            </th>
          ))}
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Events</th>
          <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Share</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            {cols.map((c) => (
              <td
                key={c.key}
                className={clsx(
                  "px-5 py-3 text-xs text-zinc-700 dark:text-zinc-300",
                  c.mono && "font-mono font-medium"
                )}
              >
                {c.key === "cc_version" ? `v${r[c.key]}` : r[c.key]}
              </td>
            ))}
            <td className="px-5 py-3 text-right text-xs text-zinc-600 dark:text-zinc-400">
              {Number(r.event_count).toLocaleString()}
            </td>
            <td className="px-5 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(Number(r.event_count) / total) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-zinc-500">
                  {((Number(r.event_count) / total) * 100).toFixed(1)}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TAB = "inline-flex items-center px-3 py-1.5 text-sm rounded-md transition-colors " +
  "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 " +
  "data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm " +
  "dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-50";

interface Props {
  data: ClientInfoStats[];
  versionOverTime: DailyDimension[];
  modelUsersOverTime: DailyDimension[];
}

export default function ClientInfoTabs({ data, versionOverTime, modelUsersOverTime }: Props) {
  const byTerminal = data.reduce<Record<string, { event_count: number }>>(
    (acc, r) => {
      const k = r.terminal_type || "unknown";
      if (!acc[k]) acc[k] = { event_count: 0 };
      acc[k].event_count += r.event_count;
      return acc;
    },
    {}
  );
  const terminalRows = Object.entries(byTerminal)
    .map(([terminal_type, v]) => ({ terminal_type, ...v }))
    .sort((a, b) => b.event_count - a.event_count);

  const byOs = data.reduce<Record<string, { event_count: number }>>(
    (acc, r) => {
      const k = `${r.os_type} / ${r.host_arch}`;
      if (!acc[k]) acc[k] = { event_count: 0 };
      acc[k].event_count += r.event_count;
      return acc;
    },
    {}
  );
  const osRows = Object.entries(byOs)
    .map(([os_arch, v]) => ({ os_arch, ...v }))
    .sort((a, b) => b.event_count - a.event_count);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Tabs.Root defaultValue="version">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Adoption &amp; environment</h2>
          <Tabs.List className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/60">
            <Tabs.Trigger value="version" className={TAB}>Version</Tabs.Trigger>
            <Tabs.Trigger value="model" className={TAB}>Model</Tabs.Trigger>
            <Tabs.Trigger value="terminal" className={TAB}>Terminal</Tabs.Trigger>
            <Tabs.Trigger value="os" className={TAB}>OS + Arch</Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="version">
          <div className="p-5">
            <AdoptionChart title="Daily active users by CC version" data={versionOverTime} height={200} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="model">
          <div className="p-5">
            <AdoptionChart title="Daily active users by model" data={modelUsersOverTime} height={200} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="terminal">
          <div className="overflow-x-auto">
            <SimpleTable
              rows={terminalRows}
              cols={[{ key: "terminal_type", label: "Terminal" }]}
            />
          </div>
        </Tabs.Content>

        <Tabs.Content value="os">
          <div className="overflow-x-auto">
            <SimpleTable
              rows={osRows}
              cols={[{ key: "os_arch", label: "OS / Arch" }]}
            />
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
