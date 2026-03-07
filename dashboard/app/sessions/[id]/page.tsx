import { getSessionEvents } from "@/lib/queries/sessions";
import SessionTimeline from "@/components/SessionTimeline";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const events = await getSessionEvents(id).catch(() => []);

  const totalCost = events.reduce((s, e) => s + e.cost_usd, 0);
  const totalInput = events.reduce((s, e) => s + e.input_tokens, 0);
  const totalOutput = events.reduce((s, e) => s + e.output_tokens, 0);

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
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Session
          </h1>
          <p className="mt-0.5 font-mono text-xs text-zinc-400">{id}</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary bar */}
        <div className="mb-6 flex flex-wrap gap-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Stat label="Events" value={String(events.length)} />
          <Stat label="Cost" value={`$${totalCost.toFixed(4)}`} />
          <Stat label="Input tokens" value={totalInput.toLocaleString()} />
          <Stat label="Output tokens" value={totalOutput.toLocaleString()} />
        </div>

        <div className="mb-6">
          <SessionTimeline events={events} />
        </div>

        {/* Event timeline */}
        {events.length === 0 ? (
          <p className="text-zinc-500">No events found for this session.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((event, i) => (
              <li
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {event.event_name || "event"}
                    </span>
                    {event.model && (
                      <span className="text-xs text-zinc-500">{event.model}</span>
                    )}
                    {event.tool_name && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {event.tool_name}
                        {event.decision ? ` · ${event.decision}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-400">
                    {event.cost_usd > 0 && (
                      <span>${event.cost_usd.toFixed(5)}</span>
                    )}
                    {event.input_tokens > 0 && (
                      <span>
                        {event.input_tokens.toLocaleString()} in / {event.output_tokens.toLocaleString()} out
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{event.timestamp}</p>
                {event.body && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {event.body}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
