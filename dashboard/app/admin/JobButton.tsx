"use client";

import { useState } from "react";

export default function JobButton({
  endpoint,
  incrementalLabel = "Run incremental",
  fullLabel = "Reprocess all",
}: {
  endpoint: string;
  incrementalLabel?: string;
  fullLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(full: boolean) {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(full ? { full: true } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => run(false)}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Running…" : incrementalLabel}
        </button>
        <button
          onClick={() => run(true)}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {loading ? "Running…" : fullLabel}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">Done</p>
          <ul className="mt-1 space-y-0.5 text-emerald-700 dark:text-emerald-400">
            {Object.entries(result).map(([k, v]) => (
              <li key={k}>{k.replace(/_/g, " ")}: {String(v)}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
