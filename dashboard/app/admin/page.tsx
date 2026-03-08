import Link from "next/link";
import clickhouse from "@/lib/clickhouse";
import { LOGIC_VERSION } from "@/lib/inferRepo";
import InferReposButton from "./InferReposButton";

export const dynamic = "force-dynamic";

async function getRepoStats() {
  const result = await clickhouse.query({
    query: `
      SELECT
        count()                                          AS total,
        countIf(logic_version = {version:UInt8})        AS current_version,
        max(computed_at)                                 AS last_run
      FROM otel.session_repo FINAL
    `,
    query_params: { version: LOGIC_VERSION },
    format: "JSONEachRow",
  });
  const rows = await result.json<{
    total: string;
    current_version: string;
    last_run: string;
  }>();
  const r = rows[0];
  return {
    total: parseInt(r?.total ?? "0"),
    current_version: parseInt(r?.current_version ?? "0"),
    stale: parseInt(r?.total ?? "0") - parseInt(r?.current_version ?? "0"),
    last_run: r?.last_run ?? null,
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const stats = await getRepoStats().catch(() => null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Admin</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Repo inference
          </h2>

          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Sessions with repo" value={String(stats.total)} />
              <StatCard label="Current version" value={String(stats.current_version)} />
              <StatCard label="Stale" value={String(stats.stale)} />
              <StatCard label="Logic version" value={`v${LOGIC_VERSION}`} />
            </div>
          )}

          {stats?.last_run && (
            <p className="mb-4 text-xs text-zinc-400">
              Last run: {stats.last_run.slice(0, 19).replace("T", " ")} UTC
            </p>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Run inference job
            </h3>
            <p className="mb-4 text-xs text-zinc-400">
              <strong>Incremental</strong> — processes only sessions not yet at logic version v{LOGIC_VERSION}.{" "}
              <strong>Reprocess all</strong> — reruns over every session regardless of version.
              Bump <code className="font-mono">LOGIC_VERSION</code> in{" "}
              <code className="font-mono">lib/inferRepo.ts</code> after changing extraction logic,
              then run incremental to catch stale sessions.
            </p>
            <InferReposButton />
          </div>
        </section>
      </main>
    </div>
  );
}
