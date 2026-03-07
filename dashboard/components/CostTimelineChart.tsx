"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyStats } from "@/lib/queries/byDay";

// Pivot data so each date is one object with one key per model
function pivotData(rows: DailyStats[]) {
  const byDate = new Map<string, Record<string, number>>();
  const models = new Set<string>();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, { date_label: r.date as unknown as number });
    byDate.get(r.date)![r.model] = r.cost_usd;
    if (r.model) models.add(r.model);
  }
  return { data: Array.from(byDate.values()), models: Array.from(models) };
}

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899",
];

export default function CostTimelineChart({ data }: { data: DailyStats[] }) {
  const { data: pivoted, models } = pivotData(data);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Daily cost by model
      </h2>
      {pivoted.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date_label"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => String(v).slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              formatter={(v) => [`$${Number(v).toFixed(4)}`, undefined]}
            />
            <Legend />
            {models.map((model, i) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
