import type { ClientInfoStats } from "@/lib/queries/clientInfo";

export default function ClientInfoTable({ data }: { data: ClientInfoStats[] }) {
  const totalEvents = data.reduce((s, r) => s + r.event_count, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Client environment (30d)
        </h2>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No data yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">CC version</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Terminal</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">OS</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-500">Arch</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Sessions</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Events</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-500">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    v{r.cc_version}
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">{r.terminal_type || "—"}</td>
                  <td className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">{r.os_type || "—"}</td>
                  <td className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">{r.host_arch || "—"}</td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">{r.session_count}</td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">{r.event_count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${(r.event_count / totalEvents) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-zinc-500">
                        {((r.event_count / totalEvents) * 100).toFixed(1)}%
                      </span>
                    </div>
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
