import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseDateRange } from "@/lib/queries/dateRange";
import { getUserOverview, getUserCostOverTime, getUserToolStats, getUserSessions } from "@/lib/queries/user";
import { getMcpStats } from "@/lib/queries/tools";
import UserCostChart from "@/components/UserCostChart";
import SessionBubbleChart from "@/components/SessionBubbleChart";
import SessionsTable from "@/components/SessionsTable";
import ToolsPanel from "@/components/ToolsPanel";
import TimeRangePicker from "@/components/TimeRangePicker";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ email: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail);
  const sp = await searchParams;
  const dr = parseDateRange(sp);

  const [overview, costOverTime, tools, sessions, mcpTools] = await Promise.all([
    getUserOverview(email, dr),
    getUserCostOverTime(email, dr),
    getUserToolStats(email, dr),
    getUserSessions(email, dr, 100),
    getMcpStats(dr, email),
  ]);

  if (!overview) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back to dashboard
          </Link>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{email}</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                first seen {overview.first_seen.slice(0, 10)} ·
                last seen {overview.last_seen.slice(0, 10)}
              </p>
            </div>
            <Suspense>
              <TimeRangePicker current={dr} />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total cost" value={`$${overview.cost_usd.toFixed(2)}`} />
          <StatCard label="Sessions" value={String(overview.session_count)} />
          <StatCard
            label="Input tokens"
            value={fmt(overview.input_tokens)}
            sub={`${fmt(overview.cache_read_tokens)} cache read`}
          />
          <StatCard
            label="Output tokens"
            value={fmt(overview.output_tokens)}
            sub={`${fmt(overview.cache_creation_tokens)} cache write`}
          />
        </div>

        {/* Cost over time by model */}
        <UserCostChart data={costOverTime} />

        {/* Tools */}
        <ToolsPanel tools={tools} mcpTools={mcpTools} />

        {/* Session bubble chart */}
        <SessionBubbleChart sessions={sessions} />

        {/* Sessions table */}
        <SessionsTable data={sessions} />
      </main>
    </div>
  );
}
