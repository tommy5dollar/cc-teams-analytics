"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ModelStats } from "@/lib/queries/byModel";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899",
];

export default function ModelUsageChart({ data }: { data: ModelStats[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Cost by model (30d)
      </h2>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
            />
            <YAxis
              type="category"
              dataKey="model"
              tick={{ fontSize: 10 }}
              width={120}
            />
            <Tooltip
              formatter={(v) => [`$${Number(v).toFixed(4)}`, "cost"]}
            />
            <Bar dataKey="cost_usd" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
