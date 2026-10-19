import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Definitions,
  Kpi,
  KpiGrid,
  PageHeader,
  PeriodPicker,
} from "@/components/admin/admin-ui";
import { TimeSeriesChart } from "@/components/admin/time-series-chart";
import { overviewDefinitions } from "@/lib/admin-metrics";
import { parsePeriod, periodQuery } from "@/lib/admin-period";
import {
  catalogueKpis,
  flaggedOrderCount,
  orderKpis,
  ordersSeries,
  revenueSeries,
  signupSeries,
  stockAlerts,
  userKpis,
} from "@/lib/admin-stats";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

// The role is checked before any figure is read, so a customer gets the 404
// without the area revealing what it holds.
export default function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const period = parsePeriod(await searchParams);

  const [orders, catalogue, users, revenue, placed, signups, alerts, flagged] =
    await Promise.all([
      orderKpis(period.from, period.to),
      catalogueKpis(),
      userKpis(period.from, period.to),
      revenueSeries(period),
      ordersSeries(period),
      signupSeries(period),
      stockAlerts(),
      flaggedOrderCount(),
    ]);
  const q = periodQuery(period);

  return (
    <>
      <PageHeader title="Overview" description="Sales, orders, catalogue and customers, from the live database." />
      <PeriodPicker period={period} basePath="/admin" />

      {flagged > 0 && (
        <p role="status" className="mb-8 border border-alert p-4 text-ui">
          {flagged} paid {flagged === 1 ? "order needs" : "orders need"} a look (amount mismatch or
          oversold).{" "}
          <Link href="/admin/orders?flag=1" className="link text-ink">
            Review
          </Link>
        </p>
      )}

      <KpiGrid label="Revenue">
        <Kpi label="Gross revenue" value={formatCents(orders.grossCents)} note={`${orders.paidOrders} paid orders`} />
        <Kpi label="Refunds" value={formatCents(orders.refundsCents)} />
        <Kpi label="Net revenue" value={formatCents(orders.netCents)} />
        <Kpi
          label="Average order value"
          value={orders.averageOrderCents === null ? "—" : formatCents(orders.averageOrderCents)}
          note="Gross ÷ paid orders"
        />
      </KpiGrid>

      <KpiGrid label="Orders placed in the period">
        <Kpi
          label="Orders placed"
          value={orders.placed}
          note={<Link href={`/admin/orders?${q}`} className="link">See orders</Link>}
        />
        <Kpi label="Paid" value={orders.byStatus.paid} />
        <Kpi
          label="Pending or processing"
          value={orders.byStatus.pending + orders.byStatus.processing}
        />
        <Kpi
          label="Failed, expired, cancelled or refunded"
          value={
            orders.byStatus.payment_failed +
            orders.byStatus.expired +
            orders.byStatus.cancelled +
            orders.byStatus.refunded
          }
          note={`${orders.byStatus.refunded} refunded · ${orders.byStatus.cancelled} cancelled`}
        />
      </KpiGrid>

      <KpiGrid label="Catalogue and customers">
        <Kpi
          label="Active products"
          value={catalogue.active}
          note={`${catalogue.draft} draft · ${catalogue.archived} archived`}
        />
        <Kpi
          label="Out of stock"
          value={catalogue.outOfStock}
          tone={catalogue.outOfStock > 0 ? "alert" : "default"}
          note={`${catalogue.lowStock} low on stock`}
        />
        <Kpi label="Customers" value={users.total} note="Registered accounts" />
        <Kpi
          label="New customers"
          value={users.newInPeriod}
          note={<Link href={`/admin/signups?${q}`} className="link">See sign-ups</Link>}
        />
      </KpiGrid>

      <section aria-label="Trends" className="grid gap-10 xl:grid-cols-2">
        <TimeSeriesChart title="Gross revenue" points={revenue} format="cents" granularity={period.granularity} />
        <TimeSeriesChart title="Orders placed" points={placed} format="count" granularity={period.granularity} />
        <TimeSeriesChart title="New accounts" points={signups} format="count" granularity={period.granularity} />

        <section aria-labelledby="stock-alerts" className="flex flex-col gap-3">
          <h3 id="stock-alerts" className="eyebrow text-muted">
            Low and out of stock
          </h3>
          {alerts.length === 0 ? (
            <p className="text-ui text-muted">Every active product is above its threshold.</p>
          ) : (
            <ul className="border-t">
              {alerts.map((a) => (
                <li key={a.slug} className="flex items-baseline justify-between gap-4 border-b py-2">
                  <Link href={`/admin/products/${a.slug}`} className="link-quiet truncate">
                    {a.name}
                  </Link>
                  <span className={`shrink-0 text-ui tabular-nums ${a.totalStock === 0 ? "text-alert" : "text-muted"}`}>
                    {a.totalStock === 0 ? "Sold out" : `${a.totalStock} left`} · alert at {a.lowStockThreshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <Definitions items={[...overviewDefinitions]} />
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div aria-hidden="true" className="h-9 w-48 bg-mist" />
      <div aria-hidden="true" className="h-12 bg-mist" />
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-24 bg-mist" />
        ))}
      </div>
      <div aria-hidden="true" className="h-56 bg-mist" />
    </div>
  );
}
