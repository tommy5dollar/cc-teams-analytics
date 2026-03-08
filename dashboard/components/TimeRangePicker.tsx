"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "@/lib/queries/dateRange";

const PRESETS = [
  { label: "7d",  days: 7  },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

function isPreset(dr: DateRange): number | null {
  const toMs   = new Date(dr.to).getTime();
  const fromMs = new Date(dr.from).getTime();
  const today  = new Date().toISOString().slice(0, 10);
  if (dr.to !== today) return null;
  const diffDays = Math.round((toMs - fromMs) / 86_400_000) + 1;
  return PRESETS.find((p) => p.days === diffDays)?.days ?? null;
}

export default function TimeRangePicker({ current }: { current: DateRange }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const params     = useSearchParams();
  const activePreset = isPreset(current);

  const [showCustom, setShowCustom] = useState(activePreset === null);
  const [from, setFrom] = useState(current.from);
  const [to,   setTo]   = useState(current.to);

  function navigate(search: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    Object.keys(search).forEach((k) => sp.set(k, search[k]));
    if ("days" in search) { sp.delete("from"); sp.delete("to"); }
    if ("from" in search) { sp.delete("days"); }
    router.push(`${pathname}?${sp.toString()}`);
  }

  function applyCustom() {
    if (from && to && from <= to) navigate({ from, to });
  }

  const BTN =
    "px-3 py-1.5 text-sm rounded-md transition-colors font-medium ";
  const ACTIVE =
    "bg-indigo-600 text-white";
  const INACTIVE =
    "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            className={BTN + (activePreset === p.days ? ACTIVE : INACTIVE)}
            onClick={() => { setShowCustom(false); navigate({ days: String(p.days) }); }}
          >
            {p.label}
          </button>
        ))}
        <button
          className={BTN + (showCustom || activePreset === null ? ACTIVE : INACTIVE)}
          onClick={() => setShowCustom((v) => !v)}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="text-sm text-zinc-700 dark:text-zinc-300 bg-transparent outline-none"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="date"
            value={to}
            min={from}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setTo(e.target.value)}
            className="text-sm text-zinc-700 dark:text-zinc-300 bg-transparent outline-none"
          />
          <button
            onClick={applyCustom}
            className="ml-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      )}

      <span className="text-xs text-zinc-400">
        {current.from} → {current.to}
      </span>
    </div>
  );
}
