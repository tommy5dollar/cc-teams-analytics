"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { HourlyActivity } from "@/lib/queries/user";

function fmtHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export default function ActivityByHourChart({ data }: { data: HourlyActivity[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">Activity by hour (UTC)</h2>
        <p className="py-12 text-center text-sm text-zinc-400">No data</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    prompt_pct: d.event_count > 0 ? Math.round((d.prompt_count / d.event_count) * 100) : 0,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">Activity by hour (UTC)</h2>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 40, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11 }} interval={0} />
          <YAxis yAxisId="events" tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
          <YAxis
            yAxisId="pct"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            width={40}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "prompt_pct") return [`${value}%`, "Prompts %"];
              return [value, "Events"];
            }}
            labelFormatter={(h) => fmtHour(h as number)}
          />
          <Legend formatter={(v) => v === "prompt_pct" ? "Prompts %" : "Events"} />
          <Bar yAxisId="events" dataKey="event_count" fill="#6366f1" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="pct"
            dataKey="prompt_pct"
            type="monotone"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f59e0b" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
