// The reporting window for every admin dashboard. Pure. All periods are in
// UTC calendar days (the screen says so): `from` is inclusive, `to` exclusive.

export const presetPeriods = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
] as const;

export type PeriodKey = (typeof presetPeriods)[number]["key"] | "custom";
export type Granularity = "day" | "week" | "month";

export type Period = {
  key: PeriodKey;
  from: Date;
  to: Date;
  days: number;
  granularity: Granularity;
  label: string;
  /** Set when a custom range was rejected and the default used instead. */
  error: string | null;
};

const DAY = 86_400_000;
export const MAX_CUSTOM_DAYS = 366;
const DEFAULT: PeriodKey = "30d";

/** Midnight UTC at the start of `at`'s day. */
export function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

function isoDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** "2026-10-18" → that UTC midnight, or null for anything else. */
export function parseIsoDay(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const at = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(at.getTime()) || isoDay(at) !== raw ? null : at;
}

function granularityFor(days: number): Granularity {
  return days > 92 ? "week" : "day";
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parsePeriod(params: Params, now: Date = new Date()): Period {
  const tomorrow = new Date(startOfUtcDay(now).getTime() + DAY);
  const key = one(params.period);

  const preset = presetPeriods.find((p) => p.key === key);
  if (preset || key === undefined || key !== "custom") {
    const chosen = preset ?? presetPeriods.find((p) => p.key === DEFAULT)!;
    return {
      key: chosen.key,
      from: new Date(tomorrow.getTime() - chosen.days * DAY),
      to: tomorrow,
      days: chosen.days,
      granularity: granularityFor(chosen.days),
      label: chosen.key === "today" ? "Today" : `Last ${chosen.label}`,
      error: null,
    };
  }

  const from = parseIsoDay(one(params.from));
  const toDay = parseIsoDay(one(params.to));
  let error: string | null = null;
  if (!from || !toDay) error = "Enter both dates.";
  else if (from > toDay) error = "The start date must be on or before the end date.";
  else if (toDay >= tomorrow) error = "The end date can't be in the future.";
  else if ((toDay.getTime() - from.getTime()) / DAY + 1 > MAX_CUSTOM_DAYS) {
    error = `Choose a range of ${MAX_CUSTOM_DAYS} days or fewer.`;
  }
  if (error || !from || !toDay) {
    return { ...parsePeriod({ period: DEFAULT }, now), error };
  }

  const to = new Date(toDay.getTime() + DAY);
  const days = Math.round((to.getTime() - from.getTime()) / DAY);
  return {
    key: "custom",
    from,
    to,
    days,
    granularity: granularityFor(days),
    label: `${isoDay(from)} to ${isoDay(toDay)}`,
    error: null,
  };
}

/** The window of the same length just before, for "vs previous period". */
export function previousPeriod(period: Period): { from: Date; to: Date } {
  const span = period.to.getTime() - period.from.getTime();
  return { from: new Date(period.from.getTime() - span), to: period.from };
}

/**
 * Every bucket in the period, as the ISO day it starts on. Weeks start on
 * Monday and months on the 1st, as Postgres date_trunc() does, so SQL rows
 * key straight in.
 */
export function buckets(period: Pick<Period, "from" | "to" | "granularity">): string[] {
  const keys: string[] = [];
  let at = startOfUtcDay(period.from);
  if (period.granularity === "month") {
    at = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
    for (; at < period.to; at = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1))) {
      keys.push(isoDay(at));
    }
    return keys;
  }
  if (period.granularity === "week") {
    const weekday = (at.getUTCDay() + 6) % 7; // Monday = 0
    at = new Date(at.getTime() - weekday * DAY);
  }
  const step = period.granularity === "week" ? 7 * DAY : DAY;
  for (; at < period.to; at = new Date(at.getTime() + step)) keys.push(isoDay(at));
  return keys;
}

/** SQL rows (bucket → value) laid onto every bucket, zeros where none. */
export function fillSeries(
  keys: readonly string[],
  rows: readonly { bucket: string; value: number }[],
): { bucket: string; value: number }[] {
  const byKey = new Map(rows.map((r) => [r.bucket.slice(0, 10), Number(r.value)]));
  return keys.map((bucket) => ({ bucket, value: byKey.get(bucket) ?? 0 }));
}

/** Query-string for a period, to keep it across links. */
export function periodQuery(period: Period): string {
  if (period.key !== "custom") return `period=${period.key}`;
  const lastDay = new Date(period.to.getTime() - DAY);
  return `period=custom&from=${isoDay(period.from)}&to=${isoDay(lastDay)}`;
}
