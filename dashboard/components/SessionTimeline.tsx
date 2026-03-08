"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SessionEvent } from "@/lib/queries/sessions";

const EVENT_COLORS: Record<string, string> = {
  api_request:   "#6366f1",
  tool_decision: "#f59e0b",
  tool_result:   "#10b981",
  user_prompt:   "#ec4899",
};
const FALLBACK_COLOR = "#94a3b8";

function colorFor(name: string) {
  return EVENT_COLORS[name] ?? FALLBACK_COLOR;
}

function bucketEvents(events: SessionEvent[], numBuckets = 24) {
  const times = events.map((e) => new Date(e.timestamp).getTime()).filter(Boolean);
  if (times.length === 0) return { buckets: [], eventTypes: [], windowSecs: 0, startMs: 0 };

  const startMs = Math.min(...times);
  const endMs   = Math.max(...times);
  const spanMs  = Math.max(endMs - startMs, 1000); // at least 1s

  // Pick a round window size: 30s, 1m, 2m, 5m, 10m, 15m, 30m, 1h …
  const idealWindowMs = spanMs / numBuckets;
  const STEPS = [30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400].map((s) => s * 1000);
  const windowMs = STEPS.find((s) => s >= idealWindowMs) ?? STEPS[STEPS.length - 1];

  const n = Math.ceil(spanMs / windowMs) + 1;
  const eventTypes = Array.from(new Set(events.map((e) => e.event_name).filter(Boolean)));

  const buckets: Array<Record<string, number | string>> = Array.from({ length: n }, (_, i) => {
    const t = startMs + i * windowMs;
    return { label: formatLabel(t, windowMs), _startMs: t };
  });

  for (const ev of events) {
    const t = new Date(ev.timestamp).getTime();
    if (!t) continue;
    const idx = Math.floor((t - startMs) / windowMs);
    if (idx < 0 || idx >= buckets.length) continue;
    const key = ev.event_name || "unknown";
    buckets[idx][key] = ((buckets[idx][key] as number) || 0) + 1;
  }

  return { buckets, eventTypes, windowSecs: windowMs / 1000, startMs };
}

function formatLabel(ms: number, windowMs: number): string {
  const d = new Date(ms);
  if (windowMs < 60_000) {
    // show HH:MM:SS
    return d.toISOString().slice(11, 19);
  }
  // show HH:MM
  return d.toISOString().slice(11, 16);
}

function fmtDuration(secs: number): string {
  if (secs < 60)  return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

export default function SessionTimeline({ events }: { events: SessionEvent[] }) {
  if (events.length === 0) return null;

  const { buckets, eventTypes, windowSecs } = bucketEvents(events);

  const times = events.map((e) => new Date(e.timestamp).getTime()).filter(Boolean);
  const sessionDurationSecs = (Math.max(...times) - Math.min(...times)) / 1000;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Event timeline
        </h2>
        <span className="text-xs text-zinc-400">
          {fmtDuration(sessionDurationSecs)} · {Math.round(windowSecs)}s windows
        </span>
      </div>
      <p className="mb-4 text-xs text-zinc-400">
        {new Date(Math.min(...times)).toISOString().replace("T", " ").slice(0, 19)} UTC
        {" → "}
        {new Date(Math.max(...times)).toISOString().replace("T", " ").slice(0, 19)} UTC
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={buckets} barSize={Math.max(4, Math.floor(600 / buckets.length))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
          <Tooltip
            labelFormatter={(l) => `Window: ${l} UTC`}
            formatter={(v, name) => [Number(v), String(name)]}
          />
          <Legend />
          {eventTypes.map((type) => (
            <Bar
              key={type}
              dataKey={type}
              stackId="a"
              fill={colorFor(type)}
              radius={type === eventTypes[eventTypes.length - 1] ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
