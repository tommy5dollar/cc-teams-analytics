"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { DailyDimension } from "@/lib/queries/clientInfo";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899",
];

function pivot(rows: DailyDimension[]) {
  const byDate = new Map<string, Record<string, number>>();
  const dims = new Set<string>();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, { _date: r.date as unknown as number });
    byDate.get(r.date)![r.dimension] = r.users;
    dims.add(r.dimension);
  }
  return { data: Array.from(byDate.values()), dims: Array.from(dims) };
}

interface Props {
  title: string;
  data: DailyDimension[];
  height?: number;
}

export default function AdoptionChart({ title, data, height = 220 }: Props) {
  const { data: pivoted, dims } = pivot(data);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h2>
      {pivoted.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="_date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => String(v).slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
            <Tooltip labelFormatter={(v) => String(v)} formatter={(v, name) => [Number(v), String(name)]} />
            <Legend />
            {dims.map((dim, i) => (
              <Bar
                key={dim}
                dataKey={dim}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
                radius={dim === dims[dims.length - 1] ? [3, 3, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
