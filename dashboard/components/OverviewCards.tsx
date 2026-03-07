import type { OverviewStats } from "@/lib/queries/overview";

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "—";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function Card({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      {(sub || trend) && (
        <p className="mt-1 text-xs text-zinc-400">
          {trend && <span>{trend} vs last month</span>}
          {sub && !trend && <span>{sub}</span>}
        </p>
      )}
    </div>
  );
}

export default function OverviewCards({ data }: { data: OverviewStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card
        label="Cost this month"
        value={`$${data.costThisMonth.toFixed(2)}`}
        trend={pctChange(data.costThisMonth, data.costLastMonth)}
      />
      <Card
        label="Total tokens"
        value={data.totalTokens > 1_000_000
          ? `${(data.totalTokens / 1_000_000).toFixed(1)}M`
          : data.totalTokens.toLocaleString()}
      />
      <Card label="Active users" value={String(data.activeUsers)} />
      <Card label="Sessions" value={data.sessionCount.toLocaleString()} />
    </div>
  );
}
