import type { UserStats } from "@/lib/queries/byUser";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function UserBreakdownTable({ data }: { data: UserStats[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          User breakdown (30d)
        </h2>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No data yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500 uppercase">User</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Cost</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Input</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Output</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Sessions</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.map((u) => (
                <tr key={u.user_email} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {u.user_email}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                    ${u.cost_usd.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {fmt(u.input_tokens)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {fmt(u.output_tokens)}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {u.session_count}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {fmt(u.event_count)}
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
