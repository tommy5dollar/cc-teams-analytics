"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { useRouter } from "next/navigation";
import type { SessionSummary } from "@/lib/queries/sessions";

const USER_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899",
];

function fmtDate(ts: number) {
  return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
}

function fmtDuration(startedAt: string, endedAt: string) {
  const secs = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: SessionSummary & { _ts: number } }[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg text-left dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-mono text-xs text-zinc-400">{s.session_id.slice(0, 20)}…</p>
      <p className="mt-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        ${s.cost_usd.toFixed(4)}
      </p>
      <div className="mt-1 space-y-0.5 text-xs text-zinc-500">
        <p>{s.user_email}</p>
        <p>{s.event_count} events · {fmtDuration(s.started_at, s.ended_at)}</p>
        <p>{s.models.map((m) => m.replace("claude-", "").replace(/-\d{8}$/, "")).join(" + ")}</p>
        <p>{fmtDate(s._ts)} UTC</p>
      </div>
      <p className="mt-2 text-xs font-medium text-indigo-500">Click to open session →</p>
    </div>
  );
}

function BubbleChart({
  sessions,
  colorByUser,
  userColorMap,
  onClickSession,
}: {
  sessions: (SessionSummary & { _ts: number })[];
  colorByUser: boolean;
  userColorMap: Map<string, string>;
  onClickSession: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return <p className="py-16 text-center text-sm text-zinc-400">No sessions in range</p>;
  }

  const costs = sessions.map((s) => s.cost_usd);
  const maxCost = Math.max(...costs);
  // Normalise bubble area: smallest ~40px, largest ~800px
  const zRange: [number, number] = [40, Math.max(200, Math.min(800, sessions.length * 20))];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis
          dataKey="_ts"
          type="number"
          domain={["auto", "auto"]}
          tickFormatter={(v) => new Date(v).toISOString().slice(5, 10)}
          tick={{ fontSize: 10 }}
          name="Date"
        />
        <YAxis
          dataKey="cost_usd"
          type="number"
          tickFormatter={(v) => `$${v.toFixed(2)}`}
          tick={{ fontSize: 10 }}
          width={54}
          name="Cost"
        />
        <ZAxis dataKey="cost_usd" range={zRange} name="Cost" />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        {colorByUser && (
          <Legend
            formatter={(value) => (
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{value}</span>
            )}
          />
        )}
        <Scatter
          data={sessions}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => onClickSession(d.session_id)}
          style={{ cursor: "pointer" }}
        >
          {sessions.map((s, i) => (
            <Cell
              key={s.session_id}
              fill={colorByUser ? (userColorMap.get(s.user_email) ?? "#6366f1") : "#6366f1"}
              fillOpacity={0.75}
              stroke={colorByUser ? (userColorMap.get(s.user_email) ?? "#6366f1") : "#6366f1"}
              strokeWidth={1}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export default function SessionBubbleChart({ sessions }: { sessions: SessionSummary[] }) {
  const router = useRouter();
  const userColorMap = new Map(
    Array.from(new Set(sessions.map((s) => s.user_email))).map((u, i) => [u, USER_COLORS[i % USER_COLORS.length]])
  );

  const enriched = sessions.map((s) => ({ ...s, _ts: new Date(s.started_at).getTime() }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sessions over time</h2>
        <p className="text-xs text-zinc-400">Bubble size and Y-axis proportional to cost</p>
      </div>
      <div className="p-4">
        <BubbleChart
          sessions={enriched}
          colorByUser={false}
          userColorMap={userColorMap}
          onClickSession={(id) => router.push(`/sessions/${encodeURIComponent(id)}`)}
        />
      </div>
    </div>
  );
}
