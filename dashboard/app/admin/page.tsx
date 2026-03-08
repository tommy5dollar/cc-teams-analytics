import Link from "next/link";
import clickhouse from "@/lib/clickhouse";
import { LOGIC_VERSION } from "@/lib/inferRepo";
import JobButton from "./JobButton";

export const dynamic = "force-dynamic";

async function getRepoStats() {
  const result = await clickhouse.query({
    query: `
      SELECT
        count()                                    AS total,
        countIf(logic_version = {version:UInt8})  AS current_version,
        max(computed_at)                           AS last_run
      FROM otel.session_repo FINAL
    `,
    query_params: { version: LOGIC_VERSION },
    format: "JSONEachRow",
  });
  const rows = await result.json<{ total: string; current_version: string; last_run: string }>();
  const r = rows[0];
  return {
    total:           parseInt(r?.total ?? "0"),
    current_version: parseInt(r?.current_version ?? "0"),
    stale:           parseInt(r?.total ?? "0") - parseInt(r?.current_version ?? "0"),
    last_run:        r?.last_run ?? null,
  };
}

async function getLinkStats() {
  const result = await clickhouse.query({
    query: `
      SELECT
        count()          AS total,
        max(computed_at) AS last_run
      FROM otel.session_links FINAL
    `,
    format: "JSONEachRow",
  });
  const rows = await result.json<{ total: string; last_run: string }>();
  const r = rows[0];
  return {
    total:    parseInt(r?.total ?? "0"),
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

function JobCard({
  title,
  description,
  endpoint,
  lastRun,
  children,
}: {
  title: string;
  description: React.ReactNode;
  endpoint: string;
  lastRun: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <p className="mb-4 text-xs text-zinc-400">{description}</p>
      {children}
      <div className="mt-4">
        <JobButton endpoint={endpoint} />
      </div>
      {lastRun && (
        <p className="mt-3 text-xs text-zinc-400">
          Last run: {lastRun.slice(0, 19).replace("T", " ")} UTC
        </p>
      )}
    </div>
  );
}

export default async function AdminPage() {
  const [repoStats, linkStats] = await Promise.all([
    getRepoStats().catch(() => null),
    getLinkStats().catch(() => null),
  ]);

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
          {repoStats && (
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Sessions with repo" value={String(repoStats.total)} />
              <StatCard label="At current version" value={String(repoStats.current_version)} />
              <StatCard label="Stale" value={String(repoStats.stale)} />
              <StatCard label="Logic version" value={`v${LOGIC_VERSION}`} />
            </div>
          )}
          <JobCard
            title="Run inference job"
            endpoint="/api/admin/infer-repos"
            lastRun={repoStats?.last_run ?? null}
            description={
              <>
                <strong>Incremental</strong> — processes only sessions not yet at logic version v{LOGIC_VERSION}.{" "}
                <strong>Reprocess all</strong> — reruns over every session.
                Bump <code className="font-mono">LOGIC_VERSION</code> in{" "}
                <code className="font-mono">lib/inferRepo.ts</code> after changing extraction logic,
                then run incremental to catch stale sessions.
              </>
            }
          />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Session links
          </h2>
          {linkStats && (
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Resume links" value={String(linkStats.total)} />
            </div>
          )}
          <JobCard
            title="Compute session links"
            endpoint="/api/admin/session-links"
            lastRun={linkStats?.last_run ?? null}
            description={
              <>
                Finds sessions that share a <code className="font-mono">prompt.id</code>, indicating
                one was resumed from the other via <code className="font-mono">/resume</code>.
                Writes parent→child edges to <code className="font-mono">otel.session_links</code>.{" "}
                <strong>Incremental</strong> skips prompt IDs already processed.{" "}
                <strong>Reprocess all</strong> recomputes every link.
              </>
            }
          />
        </section>

      </main>
    </div>
  );
}
