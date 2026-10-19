import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { buckets, fillSeries, type Period } from "@/lib/admin-period";

/*
 * Dashboard aggregates, computed in Postgres: nothing here loads the
 * catalogue, the orders or the users into memory. Request-time and uncached:
 * an admin sees the numbers as they are now. Definitions shown in the UI
 * live in src/lib/admin-metrics.ts.
 */

const iso = (d: Date) => d.toISOString();

function rangeOf(column: string, from: Date, to: Date) {
  return sql`${sql.raw(column)} >= ${iso(from)}::timestamptz and ${sql.raw(column)} < ${iso(to)}::timestamptz`;
}

export type OrderKpis = {
  grossCents: number;
  refundsCents: number;
  netCents: number;
  paidOrders: number;
  averageOrderCents: number | null;
  placed: number;
  byStatus: Record<
    "pending" | "processing" | "paid" | "payment_failed" | "expired" | "cancelled" | "refunded",
    number
  >;
};

export async function orderKpis(from: Date, to: Date): Promise<OrderKpis> {
  const paidIn = rangeOf("paid_at", from, to);
  const placedIn = sql`stripe_checkout_session_id is not null and ${rangeOf("created_at", from, to)}`;
  const result = await db.execute(sql`
    select
      coalesce(sum(total_cents) filter (where status in ('paid', 'refunded') and ${paidIn}), 0)::bigint as gross,
      count(*) filter (where status in ('paid', 'refunded') and ${paidIn})::int as paid_orders,
      coalesce(sum(refunded_cents) filter (where ${rangeOf("refunded_at", from, to)}), 0)::bigint as refunds,
      count(*) filter (where ${placedIn})::int as placed,
      count(*) filter (where ${placedIn} and status = 'pending')::int as pending,
      count(*) filter (where ${placedIn} and status = 'processing')::int as processing,
      count(*) filter (where ${placedIn} and status = 'paid')::int as paid,
      count(*) filter (where ${placedIn} and status = 'payment_failed')::int as payment_failed,
      count(*) filter (where ${placedIn} and status = 'expired')::int as expired,
      count(*) filter (where ${placedIn} and status = 'cancelled')::int as cancelled,
      count(*) filter (where ${placedIn} and status = 'refunded')::int as refunded
    from orders`);
  const r = result.rows[0] as Record<string, string | number>;
  const n = (k: string) => Number(r[k] ?? 0);
  const gross = n("gross");
  const paidOrders = n("paid_orders");
  return {
    grossCents: gross,
    refundsCents: n("refunds"),
    netCents: gross - n("refunds"),
    paidOrders,
    averageOrderCents: paidOrders > 0 ? Math.round(gross / paidOrders) : null,
    placed: n("placed"),
    byStatus: {
      pending: n("pending"),
      processing: n("processing"),
      paid: n("paid"),
      payment_failed: n("payment_failed"),
      expired: n("expired"),
      cancelled: n("cancelled"),
      refunded: n("refunded"),
    },
  };
}

export type CatalogueKpis = {
  active: number;
  draft: number;
  archived: number;
  outOfStock: number;
  lowStock: number;
};

export async function catalogueKpis(): Promise<CatalogueKpis> {
  const result = await db.execute(sql`
    with p as (
      select p.status, p.made_to_order, p.low_stock_threshold,
        coalesce((select sum(v.stock_quantity) from product_variants v where v.product_id = p.id), 0) as total
      from products p
    )
    select
      count(*) filter (where status = 'active')::int as active,
      count(*) filter (where status = 'draft')::int as draft,
      count(*) filter (where status = 'archived')::int as archived,
      count(*) filter (where status = 'active' and not made_to_order and total = 0)::int as out_of_stock,
      count(*) filter (where status = 'active' and total > 0 and total <= low_stock_threshold)::int as low_stock
    from p`);
  const r = result.rows[0] as Record<string, number>;
  return {
    active: Number(r.active),
    draft: Number(r.draft),
    archived: Number(r.archived),
    outOfStock: Number(r.out_of_stock),
    lowStock: Number(r.low_stock),
  };
}

export type UserKpis = { total: number; newInPeriod: number };

export async function userKpis(from: Date, to: Date): Promise<UserKpis> {
  const result = await db.execute(sql`
    select count(*)::int as total,
      count(*) filter (where ${rangeOf("created_at", from, to)})::int as new_in_period
    from "user"`);
  const r = result.rows[0] as Record<string, number>;
  return { total: Number(r.total), newInPeriod: Number(r.new_in_period) };
}

export type SeriesPoint = { bucket: string; value: number };

async function series(period: Period, query: SQL): Promise<SeriesPoint[]> {
  const result = await db.execute(query);
  const rows = (result.rows as { bucket: string; value: string | number }[]).map((r) => ({
    bucket: String(r.bucket),
    value: Number(r.value),
  }));
  return fillSeries(buckets(period), rows);
}

function bucketOf(column: string, period: Period) {
  // Truncated in UTC, keyed as 'YYYY-MM-DD' to match buckets().
  return sql`to_char(date_trunc(${period.granularity}, ${sql.raw(column)} at time zone 'UTC'), 'YYYY-MM-DD')`;
}

/** Gross revenue (cents) by payment date. */
export function revenueSeries(period: Period) {
  const b = bucketOf("paid_at", period);
  return series(
    period,
    sql`select ${b} as bucket, coalesce(sum(total_cents), 0)::bigint as value
        from orders
        where status in ('paid', 'refunded') and ${rangeOf("paid_at", period.from, period.to)}
        group by 1`,
  );
}

/** Orders that reached Stripe, by the day they were placed. */
export function ordersSeries(period: Period) {
  const b = bucketOf("created_at", period);
  return series(
    period,
    sql`select ${b} as bucket, count(*)::int as value
        from orders
        where stripe_checkout_session_id is not null and ${rangeOf("created_at", period.from, period.to)}
        group by 1`,
  );
}

/** Accounts created, by day or week. */
export function signupSeries(period: Period) {
  const b = bucketOf("created_at", period);
  return series(
    period,
    sql`select ${b} as bucket, count(*)::int as value
        from "user"
        where ${rangeOf("created_at", period.from, period.to)}
        group by 1`,
  );
}

/** Running total of accounts at the end of each bucket. */
export async function cumulativeUsers(period: Period): Promise<SeriesPoint[]> {
  const [before, perBucket] = await Promise.all([
    db.execute(sql`select count(*)::int as n from "user" where created_at < ${iso(period.from)}::timestamptz`),
    signupSeries(period),
  ]);
  let running = Number((before.rows[0] as { n: number }).n);
  return perBucket.map((p) => ({ bucket: p.bucket, value: (running += p.value) }));
}

export type StockAlert = {
  slug: string;
  name: string;
  totalStock: number;
  lowStockThreshold: number;
  madeToOrder: boolean;
};

/** Active products at or under their threshold, emptiest first. */
export async function stockAlerts(limit = 8): Promise<StockAlert[]> {
  const result = await db.execute(sql`
    select slug, name, total::int as total_stock, low_stock_threshold, made_to_order
    from (
      select p.slug, p.name, p.low_stock_threshold, p.made_to_order,
        coalesce((select sum(v.stock_quantity) from product_variants v where v.product_id = p.id), 0) as total
      from products p
      where p.status = 'active'
    ) t
    where total <= low_stock_threshold and not (made_to_order and total = 0)
    order by total asc, name asc
    limit ${limit}`);
  return (result.rows as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug),
    name: String(r.name),
    totalStock: Number(r.total_stock),
    lowStockThreshold: Number(r.low_stock_threshold),
    madeToOrder: Boolean(r.made_to_order),
  }));
}

/** Paid orders a human should look at: amount mismatch or oversold. */
export async function flaggedOrderCount(): Promise<number> {
  const result = await db.execute(sql`
    select count(*)::int as n from orders
    where status in ('paid', 'refunded') and (amount_mismatch or oversold)
      and fulfilment_status <> 'delivered'`);
  return Number((result.rows[0] as { n: number }).n);
}
