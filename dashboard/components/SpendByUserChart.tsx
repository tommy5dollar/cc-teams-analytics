"use client";

import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
} from "recharts";
import type { UserStats } from "@/lib/queries/byUser";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: UserStats }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{d.user_email}</p>
      <p className="mt-1 text-xs text-zinc-500">{d.session_count} sessions · ${d.cost_usd.toFixed(2)}</p>
    </div>
  );
}

export default function SpendByUserChart({ data }: { data: UserStats[] }) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">Spend by user</h2>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 24, bottom: 32, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis type="number" dataKey="session_count" tick={{ fontSize: 11 }} name="Sessions">
              <Label value="Sessions" position="insideBottom" offset={-16} fontSize={11} fill="#a1a1aa" />
            </XAxis>
            <YAxis type="number" dataKey="cost_usd" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} name="Cost">
              <Label value="Cost (USD)" angle={-90} position="insideLeft" offset={16} fontSize={11} fill="#a1a1aa" />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={data}
              fill="#6366f1"
              fillOpacity={0.75}
              onClick={(d: any) => router.push(`/users/${encodeURIComponent(d.user_email)}`)}
              cursor="pointer"
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
