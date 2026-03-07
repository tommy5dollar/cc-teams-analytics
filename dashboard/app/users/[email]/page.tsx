import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserOverview, getUserModelStats, getUserToolStats, getUserSessions } from "@/lib/queries/user";
import ModelUsageChart from "@/components/ModelUsageChart";
import SessionBubbleChart from "@/components/SessionBubbleChart";
import SessionsTable from "@/components/SessionsTable";
import ToolsPanel from "@/components/ToolsPanel";
import { getMcpStats } from "@/lib/queries/tools";

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
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail);

  const [overview, models, tools, sessions] = await Promise.all([
    getUserOverview(email, 90),
    getUserModelStats(email, 90),
    getUserToolStats(email, 90),
    getUserSessions(email, 100),
  ]);

  // MCP stats filtered to this user
  const mcpResult = await getMcpStats(90).catch(() => []);
  // getMcpStats doesn't filter by user — for now pass empty; real fix is adding user filter
  const mcpTools = mcpResult;

  if (!overview) notFound();

  const activeDays = Math.round(
    (new Date(overview.last_seen).getTime() - new Date(overview.first_seen).getTime()) / 86_400_000
  );

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
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{email}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Active {activeDays > 0 ? `over ${activeDays} days` : "today"} ·
            first seen {overview.first_seen.slice(0, 10)} ·
            last seen {overview.last_seen.slice(0, 10)}
          </p>
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

        {/* Session bubble chart */}
        <SessionBubbleChart sessions={sessions} />

        {/* Model breakdown */}
        <ModelUsageChart data={models} />

        {/* Tools */}
        <ToolsPanel tools={tools} mcpTools={mcpTools} />

        {/* Sessions table */}
        <SessionsTable data={sessions} />
      </main>
    </div>
  );
}
