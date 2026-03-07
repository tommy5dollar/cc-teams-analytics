import Link from "next/link";
import type { SessionSummary } from "@/lib/queries/sessions";

export default function SessionsTable({ data }: { data: SessionSummary[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Recent sessions
        </h2>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No sessions yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Session</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 uppercase">User</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Models</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Cost</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Events</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map((s) => (
                <tr key={s.session_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/sessions/${encodeURIComponent(s.session_id)}`}
                      className="font-mono text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {s.session_id.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">{s.user_email}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.models.map((m) => (
                        <span key={m} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {m.replace("claude-", "").replace(/-\d{8}$/, "")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                    ${s.cost_usd.toFixed(4)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">{s.event_count}</td>
                  <td className="px-5 py-3 text-xs text-zinc-500">
                    {s.started_at.slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
