"use client";

import { useId, useState } from "react";

export type ChartPoint = { bucket: string; value: number };

/*
 * One series over time, in the site's ink: bars for amounts per day or week,
 * a line for a running total. No legend (the title names the series), one
 * axis, a recessive grid. Hovering or focusing a bucket shows its value; the
 * same numbers are in a table underneath for screen readers and copying.
 */
export function TimeSeriesChart({
  title,
  points,
  format,
  kind = "bar",
  granularity,
}: {
  title: string;
  points: ChartPoint[];
  /** Value → text, e.g. formatCents. Passed as a name so it can cross to the client. */
  format: "cents" | "count";
  kind?: "bar" | "line";
  granularity: "day" | "week" | "month";
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const fmt = format === "cents" ? formatCentsShort : formatCount;

  const W = 640;
  const H = 180;
  const PAD = { top: 12, right: 8, bottom: 22, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = Math.max(1, points.length);
  const slot = plotW / n;
  const gap = Math.min(2, slot * 0.2);
  const barW = Math.max(1, slot - gap);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const x = (i: number) => PAD.left + i * slot;
  const total = points.reduce((s, p) => s + p.value, 0);
  const shown = active !== null ? points[active] : null;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i) + slot / 2},${y(p.value)}`)
    .join(" ");

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow text-muted" id={`${id}-title`}>
          {title}
        </span>
        <span aria-live="polite" className="text-ui tabular-nums">
          {shown
            ? `${bucketLabel(shown.bucket, granularity)}: ${fmt(shown.value)}`
            : kind === "line"
              ? `${fmt(points.at(-1)?.value ?? 0)} now`
              : `${fmt(total)} in period`}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${id}-title`}
        className="h-auto w-full overflow-visible"
        onMouseLeave={() => setActive(null)}
      >
        {/* Recessive grid: the baseline and the top value only. */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="stroke-line" strokeWidth={1} />
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(max)}
          y2={y(max)}
          className="stroke-line"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <text x={W - PAD.right} y={y(max) - 4} textAnchor="end" className="fill-muted text-[11px]">
          {fmt(max)}
        </text>

        {kind === "bar"
          ? points.map((p, i) => {
              const h = y(0) - y(p.value);
              return (
                <path
                  key={p.bucket}
                  d={roundedTopBar(x(i) + gap / 2, y(p.value), barW, h, Math.min(4, barW / 2, h))}
                  className={active === null || active === i ? "fill-ink" : "fill-ink/30"}
                />
              );
            })
          : (
            <>
              <path d={linePath} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" />
              {shown && active !== null && (
                <>
                  <line
                    x1={x(active) + slot / 2}
                    x2={x(active) + slot / 2}
                    y1={PAD.top}
                    y2={y(0)}
                    className="stroke-muted"
                    strokeWidth={1}
                  />
                  <circle
                    cx={x(active) + slot / 2}
                    cy={y(shown.value)}
                    r={4}
                    className="fill-ink stroke-paper"
                    strokeWidth={2}
                  />
                </>
              )}
            </>
          )}

        {/* Hit targets: the full column, wider than the mark. */}
        {points.map((p, i) => (
          <rect
            key={p.bucket}
            x={x(i)}
            y={PAD.top}
            width={slot}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
          >
            <title>{`${bucketLabel(p.bucket, granularity)}: ${fmt(p.value)}`}</title>
          </rect>
        ))}

        {points.length > 0 && (
          <>
            <text x={PAD.left} y={H - 4} className="fill-muted text-[11px]">
              {bucketLabel(points[0].bucket, granularity)}
            </text>
            <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-muted text-[11px]">
              {bucketLabel(points[points.length - 1].bucket, granularity)}
            </text>
          </>
        )}
      </svg>

      <details className="text-ui">
        <summary className="cursor-pointer text-muted">View as table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="border-b text-muted">
                <th scope="col" className="py-1 font-normal">
                  {granularity === "week" ? "Week of" : granularity === "month" ? "Month" : "Day"} (UTC)
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  {title}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.bucket} className="border-b border-line/60">
                  <td className="py-1">{p.bucket}</td>
                  <td className="py-1 text-right">{fmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** A bar with 4px rounded top corners, square on the baseline. */
function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const rr = Math.max(0, r);
  return [
    `M${x},${y + h}`,
    `V${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `H${x + w - rr}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `V${y + h}`,
    "Z",
  ].join(" ");
}

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function bucketLabel(bucket: string, granularity: "day" | "week" | "month"): string {
  const at = new Date(`${bucket}T00:00:00Z`);
  if (granularity === "month") return monthFmt.format(at);
  const label = dayFmt.format(at);
  return granularity === "week" ? `Week of ${label}` : label;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatCentsShort(cents: number): string {
  return usd.format(cents / 100);
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
