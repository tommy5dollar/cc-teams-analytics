"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { DailyCostByModel } from "@/lib/queries/user";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899",
];

function shortModel(m: string) {
  return m.replace(/^claude-/, "").replace(/-\d{8}$/, "");
}

function pivot(rows: DailyCostByModel[]) {
  const byDate = new Map<string, Record<string, number>>();
  const models = new Set<string>();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, { _date: r.date as unknown as number });
    byDate.get(r.date)![r.model] = r.cost_usd;
    models.add(r.model);
  }
  return { data: Array.from(byDate.values()), models: Array.from(models) };
}

export default function UserCostChart({ data }: { data: DailyCostByModel[] }) {
  const { data: pivoted, models } = pivot(data);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">Cost over time</h2>
      {pivoted.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="_date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => String(v).slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
              width={36}
            />
            <Tooltip
              labelFormatter={(v) => String(v)}
              formatter={(v, name) => [`$${Number(v).toFixed(3)}`, shortModel(String(name))]}
            />
            <Legend formatter={(v) => shortModel(String(v))} />
            {models.map((model, i) => (
              <Bar
                key={model}
                dataKey={model}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
                radius={model === models[models.length - 1] ? [3, 3, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
