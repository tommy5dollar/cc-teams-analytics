export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

/** SQL fragment to paste into WHERE — uses named params dr_from / dr_to */
export const DATE_CONDITION =
  `timestamp >= toDateTime({dr_from:String}) AND timestamp < toDateTime({dr_to:String}) + INTERVAL 1 DAY`;

export function dateParams(dr: DateRange) {
  return { dr_from: dr.from, dr_to: dr.to };
}

export function daysRange(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/** Parses Next.js searchParams into a DateRange. Defaults to 28 days. */
export function parseDateRange(
  p: Record<string, string | string[] | undefined>
): DateRange {
  const from = typeof p.from === "string" ? p.from : null;
  const to   = typeof p.to   === "string" ? p.to   : null;
  if (
    from && to &&
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from <= to
  ) {
    return { from, to };
  }
  const days = typeof p.days === "string" ? parseInt(p.days) : NaN;
  return daysRange(!isNaN(days) && days > 0 ? days : 30);
}

/** Returns the equal-length period immediately before dr (for comparisons). */
export function priorRange(dr: DateRange): DateRange {
  const fromMs = new Date(dr.from).getTime();
  const toMs   = new Date(dr.to).getTime();
  const dur    = toMs - fromMs + 86_400_000; // inclusive duration in ms
  return {
    from: new Date(fromMs - dur).toISOString().slice(0, 10),
    to:   new Date(fromMs - 86_400_000).toISOString().slice(0, 10),
  };
}
