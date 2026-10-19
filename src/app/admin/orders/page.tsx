import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, Pagination, readPage, readQuery } from "@/components/admin/admin-ui";
import { fulfilmentStatuses, orderStatuses, type FulfilmentStatus, type OrderStatus } from "@/db/schema";
import { parsePeriod } from "@/lib/admin-period";
import { listAdminOrders, ORDERS_PAGE_SIZE, type AdminOrderQuery } from "@/lib/admin-orders";
import { formatCents } from "@/lib/format";
import { fulfilmentCopy } from "@/lib/fulfilment";
import { orderStatusCopy, orderStatusTone } from "@/lib/order-types";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Orders" };

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string) => (Array.isArray(p[k]) ? p[k][0] : p[k]);

function readQueryParams(params: Params): AdminOrderQuery & { periodKey: string | null } {
  const status = one(params, "status");
  const fulfilment = one(params, "fulfilment");
  // A period is optional here: without one, every order is listed.
  const hasPeriod = typeof one(params, "period") === "string";
  const period = hasPeriod ? parsePeriod(params) : null;
  return {
    q: readQuery(params.q),
    status: (orderStatuses as readonly unknown[]).includes(status) ? (status as OrderStatus) : null,
    fulfilment: (fulfilmentStatuses as readonly unknown[]).includes(fulfilment)
      ? (fulfilment as FulfilmentStatus)
      : null,
    flagged: one(params, "flag") === "1",
    from: period?.from ?? null,
    to: period?.to ?? null,
    page: readPage(params.page),
    periodKey: period ? period.label : null,
  };
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireAdmin("/admin/orders");
  const params = await searchParams;
  const query = readQueryParams(params);
  const { rows, total } = await listAdminOrders(query);

  const keep = new URLSearchParams();
  for (const k of ["q", "status", "fulfilment", "flag", "period", "from", "to"]) {
    const v = one(params, k);
    if (typeof v === "string" && v) keep.set(k, v);
  }
  const pageHref = (page: number) => {
    const p = new URLSearchParams(keep);
    if (page > 1) p.set("page", String(page));
    return `/admin/orders?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every checkout that reached Stripe. Payment status comes only from Stripe; preparation and delivery are moved here."
      />

      <form action="/admin/orders" method="get" role="search" aria-label="Filter orders" className="mb-8 flex flex-wrap items-end gap-3 border-b pb-6">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-ui text-muted">
          Search
          <input type="search" name="q" defaultValue={query.q} placeholder="Reference or email" className="field min-h-10 py-0 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-ui text-muted">
          Payment
          <select name="status" defaultValue={query.status ?? ""} className="field min-h-10 py-0 text-ink">
            <option value="">All</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>
                {orderStatusCopy[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-ui text-muted">
          Preparation
          <select name="fulfilment" defaultValue={query.fulfilment ?? ""} className="field min-h-10 py-0 text-ink">
            <option value="">All</option>
            {fulfilmentStatuses.map((s) => (
              <option key={s} value={s}>
                {fulfilmentCopy[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-ui text-muted">
          Placed
          <select name="period" defaultValue={one(params, "period") ?? ""} className="field min-h-10 py-0 text-ink">
            <option value="">Any time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 text-ui">
          <input type="checkbox" name="flag" value="1" defaultChecked={query.flagged} className="size-4 accent-ink" />
          Needs a look
        </label>
        <button type="submit" className="btn btn-secondary btn-sm">
          Apply
        </button>
        {keep.size > 0 && (
          <Link href="/admin/orders" className="link text-ui">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState>{keep.size > 0 ? "No orders match these filters." : "No orders yet."}</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-ui">
            <caption className="sr-only">Orders, newest first. Times in UTC.</caption>
            <thead>
              <tr className="border-b text-muted">
                <th scope="col" className="py-2 font-normal">Order</th>
                <th scope="col" className="py-2 font-normal">Placed (UTC)</th>
                <th scope="col" className="py-2 font-normal">Customer</th>
                <th scope="col" className="py-2 font-normal">Payment</th>
                <th scope="col" className="py-2 font-normal">Preparation</th>
                <th scope="col" className="py-2 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.reference} className="border-b">
                  <td className="py-3">
                    <Link href={`/admin/orders/${o.reference}`} className="link">
                      {o.reference}
                    </Link>
                    {o.flagged && <span className="ml-2 text-alert">Needs a look</span>}
                  </td>
                  <td className="py-3 tabular-nums">{dateTime.format(o.createdAt)}</td>
                  <td className="max-w-56 py-3">
                    <span className="block truncate">{o.customerName ?? "Deleted account"}</span>
                    <span className="block truncate text-muted">{o.email}</span>
                  </td>
                  <td className={`py-3 ${orderStatusTone[o.status]}`}>{orderStatusCopy[o.status]}</td>
                  <td className="py-3 text-muted">
                    {o.status === "paid" ? fulfilmentCopy[o.fulfilmentStatus] : "—"}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCents(o.totalCents ?? o.subtotalCents)}
                    <span className="block text-muted">
                      {o.itemCount} {o.itemCount === 1 ? "piece" : "pieces"}
                      {o.refundedCents > 0 ? ` · ${formatCents(o.refundedCents)} refunded` : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={query.page} pageSize={ORDERS_PAGE_SIZE} total={total} href={pageHref} />
    </>
  );
}
