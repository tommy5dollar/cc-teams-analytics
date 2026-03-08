import { getSessionEvents, getSessionModelBreakdown, type SessionEvent } from "@/lib/queries/sessions";
import { inferRepo } from "@/lib/inferRepo";
import SessionTimeline from "@/components/SessionTimeline";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function shortModel(m: string) {
  return m.replace(/^claude-/, "").replace(/-\d{8}$/, "");
}

// ── Event row renderers ──────────────────────────────────────────────────────

function ApiRequestRow({ e }: { e: SessionEvent }) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge label="api_request" color="indigo" />
          {e.model && <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{shortModel(e.model)}</span>}
          {e.duration_ms != null && <span className="text-xs text-zinc-400">{fmt(e.duration_ms)}</span>}
        </div>
        <div className="flex gap-3 text-xs text-zinc-400">
          {e.cost_usd > 0 && <span>${e.cost_usd.toFixed(5)}</span>}
          {e.input_tokens > 0 && (
            <span>{e.input_tokens.toLocaleString()} in · {e.output_tokens.toLocaleString()} out
              {e.cache_read_tokens > 0 && ` · ${e.cache_read_tokens.toLocaleString()} cached`}
            </span>
          )}
        </div>
      </div>
      <Ts value={e.timestamp} />
    </li>
  );
}

function ToolResultRow({ e }: { e: SessionEvent }) {
  const failed = e.success === false;
  return (
    <li className={`rounded-xl border p-4 ${failed
      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label="tool_result" color="amber" />
          <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">{e.tool_name}</span>
          {e.success === false && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">failed</span>}
          {e.decision_source === "config" && <span className="text-xs text-zinc-400">auto</span>}
          {e.duration_ms != null && <span className="text-xs text-zinc-400">{fmt(e.duration_ms)}</span>}
          {e.tool_result_size_bytes != null && <span className="text-xs text-zinc-400">{(e.tool_result_size_bytes / 1024).toFixed(1)}kb out</span>}
        </div>
      </div>
      {e.tool_description && (
        <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">{e.tool_description}</p>
      )}
      {e.bash_command && (
        <pre className="mt-1.5 overflow-x-auto rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{e.bash_command}</pre>
      )}
      <Ts value={e.timestamp} />
    </li>
  );
}

function ToolDecisionRow({ e }: { e: SessionEvent }) {
  const accepted = e.decision === "accept";
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <Badge label="tool_decision" color="zinc" />
        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{e.tool_name}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${accepted
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
          {e.decision}
        </span>
        {e.decision_source && <span className="text-xs text-zinc-400">{e.decision_source}</span>}
      </div>
      <Ts value={e.timestamp} />
    </li>
  );
}

function UserPromptRow({ e }: { e: SessionEvent }) {
  return (
    <li className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="flex items-center gap-2">
        <Badge label="user_prompt" color="violet" />
        {e.prompt_length != null && (
          <span className="text-xs text-zinc-500">{e.prompt_length.toLocaleString()} chars</span>
        )}
      </div>
      <Ts value={e.timestamp} />
    </li>
  );
}

function ApiErrorRow({ e }: { e: SessionEvent }) {
  return (
    <li className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex flex-wrap items-center gap-2">
        <Badge label="api_error" color="red" />
        {e.model && <span className="text-xs text-zinc-500">{shortModel(e.model)}</span>}
        {e.duration_ms != null && <span className="text-xs text-zinc-400">{fmt(e.duration_ms)} before fail</span>}
        {e.attempt != null && e.attempt > 1 && <span className="text-xs text-zinc-400">attempt {e.attempt}</span>}
      </div>
      {e.error && (
        <p className="mt-1.5 text-xs font-medium text-red-700 dark:text-red-400">{e.error}
          {e.status_code && e.status_code !== "undefined" && ` (${e.status_code})`}
        </p>
      )}
      <Ts value={e.timestamp} />
    </li>
  );
}

function EventRow({ e }: { e: SessionEvent }) {
  switch (e.event_name) {
    case "api_request":   return <ApiRequestRow e={e} />;
    case "tool_result":   return <ToolResultRow e={e} />;
    case "tool_decision": return <ToolDecisionRow e={e} />;
    case "user_prompt":   return <UserPromptRow e={e} />;
    case "api_error":     return <ApiErrorRow e={e} />;
    default: return (
      <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Badge label={e.event_name || "event"} color="zinc" />
        <Ts value={e.timestamp} />
      </li>
    );
  }
}

// ── Shared primitives ────────────────────────────────────────────────────────

const BADGE_COLORS = {
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  amber:  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  red:    "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  zinc:   "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
} as const;

function Badge({ label, color }: { label: string; color: keyof typeof BADGE_COLORS }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[color]}`}>
      {label}
    </span>
  );
}

function Ts({ value }: { value: string }) {
  return <p className="mt-1.5 text-xs text-zinc-400">{value.slice(0, 19).replace("T", " ")}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SessionPage({
  params,
}: {
  params: Promise<{ email: string; id: string }>;
}) {
  const { email: encodedEmail, id } = await params;
  const email = decodeURIComponent(encodedEmail);
  const backHref = `/users/${encodedEmail}`;

  const [events, modelBreakdown] = await Promise.all([
    getSessionEvents(id).catch(() => []),
    getSessionModelBreakdown(id).catch(() => []),
  ]);

  const bashCommands = events.filter((e) => e.bash_command).map((e) => e.bash_command);
  const repoGuess = inferRepo(bashCommands);

  const totalCost       = events.reduce((s, e) => s + e.cost_usd, 0);
  const totalInput      = events.reduce((s, e) => s + e.input_tokens, 0);
  const totalOutput     = events.reduce((s, e) => s + e.output_tokens, 0);
  const totalCacheRead  = events.reduce((s, e) => s + e.cache_read_tokens, 0);
  const totalCacheWrite = events.reduce((s, e) => s + e.cache_creation_tokens, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href={backHref} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            ← {email}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Session</h1>
            {repoGuess && (
              <span
                title={`Inferred from bash commands (${repoGuess.confidence} confidence)`}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  repoGuess.confidence === "high"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                }`}
              >
                {repoGuess.repo}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-zinc-400">{id}</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap gap-6">
            <Stat label="Events"      value={String(events.length)} />
            <Stat label="Total cost"  value={`$${totalCost.toFixed(4)}`} />
            <Stat label="Input"       value={totalInput.toLocaleString()} />
            <Stat label="Output"      value={totalOutput.toLocaleString()} />
            <Stat label="Cache read"  value={totalCacheRead.toLocaleString()} />
            <Stat label="Cache write" value={totalCacheWrite.toLocaleString()} />
          </div>
          {modelBreakdown.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium uppercase text-zinc-400">Cost by model</p>
              <div className="flex flex-wrap gap-4">
                {modelBreakdown.map((m) => (
                  <div key={m.model}>
                    <p className="font-mono text-xs text-zinc-500">{shortModel(m.model)}</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      ${m.cost_usd.toFixed(4)}
                      <span className="ml-1 text-xs font-normal text-zinc-400">{m.api_calls} calls</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline chart */}
        <div className="mb-6">
          <SessionTimeline events={events} />
        </div>

        {/* Event list */}
        {events.length === 0 ? (
          <p className="text-zinc-500">No events found for this session.</p>
        ) : (
          <ol className="space-y-2">
            {events.map((e, i) => <EventRow key={i} e={e} />)}
          </ol>
        )}
      </main>
    </div>
  );
}
