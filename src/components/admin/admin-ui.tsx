import Link from "next/link";
import type { ReactNode } from "react";
import { presetPeriods, type Period } from "@/lib/admin-period";

// Server-rendered pieces shared by the admin dashboards. Filters are plain
// GET links and forms: they work without JavaScript and keep the URL shareable.

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-title">{title}</h2>
        {description && <p className="max-w-reading text-ui text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

/** Today / 7 / 30 / 90 days, or a custom UTC range. Other params are kept. */
export function PeriodPicker({
  period,
  basePath,
  keep = {},
}: {
  period: Period;
  basePath: string;
  keep?: Record<string, string>;
}) {
  const extra = new URLSearchParams(keep).toString();
  const href = (q: string) => `${basePath}?${q}${extra ? `&${extra}` : ""}`;
  const lastDay = new Date(period.to.getTime() - 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="mb-8 flex flex-col gap-3 border-b pb-6">
      <nav aria-label="Period" className="flex flex-wrap items-center gap-2">
        {presetPeriods.map((p) => (
          <Link
            key={p.key}
            href={href(`period=${p.key}`)}
            aria-current={period.key === p.key ? "true" : undefined}
            className={`btn btn-sm ${period.key === p.key ? "btn-primary" : "btn-secondary"}`}
          >
            {p.label}
          </Link>
        ))}
        <form action={basePath} method="get" className="flex flex-wrap items-end gap-2">
          {Object.entries(keep).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="hidden" name="period" value="custom" />
          <label className="flex flex-col text-ui text-muted">
            From
            <input
              type="date"
              name="from"
              defaultValue={period.from.toISOString().slice(0, 10)}
              className="field min-h-10 py-0 text-ink"
            />
          </label>
          <label className="flex flex-col text-ui text-muted">
            To
            <input type="date" name="to" defaultValue={lastDay} className="field min-h-10 py-0 text-ink" />
          </label>
          <button
            type="submit"
            className={`btn btn-sm ${period.key === "custom" ? "btn-primary" : "btn-secondary"}`}
          >
            Apply
          </button>
        </form>
      </nav>
      <p className="text-ui text-muted">
        {period.label} · UTC calendar days
        {period.granularity === "week" ? " · grouped by week" : ""}
      </p>
      {period.error && (
        <p role="alert" className="text-ui text-alert">
          {period.error} Showing the last 30 days instead.
        </p>
      )}
    </div>
  );
}

export function Kpi({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "default" | "alert";
}) {
  return (
    <div className="flex flex-col gap-1 border p-4">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className={`font-display text-title tabular-nums ${tone === "alert" ? "text-alert" : ""}`}>
        {value}
      </dd>
      {note && <dd className="text-ui text-muted">{note}</dd>}
    </div>
  );
}

export function KpiGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section aria-label={label} className="mb-10">
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</dl>
    </section>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4 text-ui">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-secondary btn-sm">
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Page {page} of {pages} · {total.toLocaleString("en-US")} in all
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-secondary btn-sm">
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Definitions under a dashboard, so every number says what it counts. */
export function Definitions({ items }: { items: { term: string; detail: string }[] }) {
  return (
    <details className="mt-10 border-t pt-6 text-ui">
      <summary className="cursor-pointer eyebrow text-muted">How these numbers are counted</summary>
      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        {items.map((d) => (
          <div key={d.term}>
            <dt className="text-ink">{d.term}</dt>
            <dd className="text-muted">{d.detail}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="border border-dashed p-8 text-center text-muted">{children}</p>;
}

/** A page number from the query string: 1 or more, capped. */
export function readPage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/** A trimmed search term from the query string, or "". */
export function readQuery(raw: string | string[] | undefined, max = 80): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
