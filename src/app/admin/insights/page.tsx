import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Definitions, Kpi, KpiGrid, PageHeader, PeriodPicker } from "@/components/admin/admin-ui";
import {
  conversion,
  eventTotals,
  MIN_VIEWS_FOR_RATE,
  topByEvent,
  topCheckedOut,
  topPurchased,
  trackingSince,
  type ConversionRow,
  type RankedProduct,
  type SalesRank,
} from "@/lib/admin-insights";
import { insightsDefinitions } from "@/lib/admin-metrics";
import { parsePeriod } from "@/lib/admin-period";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Product insights" };

export default function AdminInsightsPage({ searchParams }: PageProps<"/admin/insights">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
      <Insights searchParams={searchParams} />
    </Suspense>
  );
}

async function Insights({ searchParams }: { searchParams: PageProps<"/admin/insights">["searchParams"] }) {
  await requireAdmin("/admin/insights");
  const period = parsePeriod(await searchParams);

  const [since, totals, views, clicks, adds, checkouts, purchases, best, worst] = await Promise.all([
    trackingSince(),
    eventTotals(period),
    topByEvent("view", period),
    topByEvent("click", period),
    topByEvent("add_to_bag", period),
    topCheckedOut(period),
    topPurchased(period),
    conversion(period, "highest"),
    conversion(period, "lowest"),
  ]);

  return (
    <>
      <PageHeader
        title="Product insights"
        description="What draws attention and what sells, kept apart: views, clicks and bag adds are first-party events; checkouts and purchases come from orders."
      />
      <PeriodPicker period={period} basePath="/admin/insights" />

      <p role="note" className="mb-8 border-l-2 border-ink pl-4 text-ui">
        {since
          ? `Event tracking started on ${since} (UTC). Views, clicks and bag adds before that date were never recorded and are not estimated.`
          : "No product event recorded yet. Views, clicks and bag adds appear here once visitors browse the store; nothing before that is estimated."}
      </p>

      <KpiGrid label="Events in the period">
        <Kpi label="Product views" value={totals.view.events} note={`${totals.view.products} products`} />
        <Kpi label="Card clicks" value={totals.click.events} note={`${totals.click.products} products`} />
        <Kpi label="Bag adds" value={totals.add_to_bag.events} note={`${totals.add_to_bag.products} products`} />
      </KpiGrid>

      <div className="grid gap-10 xl:grid-cols-2">
        <EventTable title="Most viewed" unit="Views" rows={views} />
        <EventTable title="Most clicked" unit="Clicks" rows={clicks} />
        <EventTable title="Most added to bag" unit="Adds" rows={adds} />
        <SalesTable title="Most checked out" rows={checkouts} />
        <SalesTable title="Best sellers" rows={purchases} revenue />
        <ConversionTable
          title="Highest conversion"
          rows={best}
          empty={`No product had ${MIN_VIEWS_FOR_RATE} or more views in this period.`}
        />
        <ConversionTable
          title="Viewed but rarely bought"
          rows={worst}
          empty={`No product had ${MIN_VIEWS_FOR_RATE} or more views in this period.`}
        />
      </div>

      <Definitions items={[...insightsDefinitions]} />
    </>
  );
}

function Table({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="eyebrow text-muted">{title}</h3>
      {children}
    </section>
  );
}

function ProductLink({ slug, name }: { slug: string; name: string }) {
  return (
    <Link href={`/admin/products/${slug}`} className="link-quiet block truncate">
      {name}
    </Link>
  );
}

function change(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "new" : "—";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

function EventTable({ title, unit, rows }: { title: string; unit: string; rows: RankedProduct[] }) {
  return (
    <Table title={title}>
      {rows.length === 0 ? (
        <p className="text-ui text-muted">Nothing recorded in this period.</p>
      ) : (
        <table className="w-full text-left text-ui">
          <thead>
            <tr className="border-b text-muted">
              <th scope="col" className="py-1 font-normal">Product</th>
              <th scope="col" className="py-1 text-right font-normal">{unit}</th>
              <th scope="col" className="py-1 text-right font-normal">vs previous</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b">
                <td className="max-w-56 py-2"><ProductLink slug={r.slug} name={r.name} /></td>
                <td className="py-2 text-right tabular-nums">{r.current}</td>
                <td className="py-2 text-right tabular-nums text-muted">{change(r.current, r.previous)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Table>
  );
}

function SalesTable({ title, rows, revenue = false }: { title: string; rows: SalesRank[]; revenue?: boolean }) {
  return (
    <Table title={title}>
      {rows.length === 0 ? (
        <p className="text-ui text-muted">No orders in this period.</p>
      ) : (
        <table className="w-full text-left text-ui">
          <thead>
            <tr className="border-b text-muted">
              <th scope="col" className="py-1 font-normal">Product</th>
              <th scope="col" className="py-1 text-right font-normal">Units</th>
              <th scope="col" className="py-1 text-right font-normal">Orders</th>
              {revenue && <th scope="col" className="py-1 text-right font-normal">Revenue</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b">
                <td className="max-w-56 py-2"><ProductLink slug={r.slug} name={r.name} /></td>
                <td className="py-2 text-right tabular-nums">{r.units}</td>
                <td className="py-2 text-right tabular-nums">{r.orders}</td>
                {revenue && <td className="py-2 text-right tabular-nums">{formatCents(r.revenueCents)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Table>
  );
}

function ConversionTable({ title, rows, empty }: { title: string; rows: ConversionRow[]; empty: string }) {
  return (
    <Table title={title}>
      {rows.length === 0 ? (
        <p className="text-ui text-muted">{empty}</p>
      ) : (
        <table className="w-full text-left text-ui">
          <thead>
            <tr className="border-b text-muted">
              <th scope="col" className="py-1 font-normal">Product</th>
              <th scope="col" className="py-1 text-right font-normal">Views</th>
              <th scope="col" className="py-1 text-right font-normal">Paid orders</th>
              <th scope="col" className="py-1 text-right font-normal">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b">
                <td className="max-w-56 py-2"><ProductLink slug={r.slug} name={r.name} /></td>
                <td className="py-2 text-right tabular-nums">{r.views}</td>
                <td className="py-2 text-right tabular-nums">{r.paidOrders}</td>
                <td className="py-2 text-right tabular-nums">{(r.rate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Table>
  );
}
