import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { ProductEventType } from "@/db/schema";
import { previousPeriod, type Period } from "@/lib/admin-period";

/*
 * Product attention, kept apart by kind: views, card clicks and bag adds
 * come from product_events (one row per visitor, product, type and day);
 * checkouts and purchases come from the order snapshots, which already hold
 * the truth. Nothing here is reconstructed from before tracking started.
 */

const day = (d: Date) => d.toISOString().slice(0, 10);

export type RankedProduct = {
  slug: string;
  name: string;
  current: number;
  previous: number;
};

export const RANK_LIMIT = 10;

/** Top products for one event type, with the previous period alongside. */
export async function topByEvent(type: ProductEventType, period: Period): Promise<RankedProduct[]> {
  const prev = previousPeriod(period);
  const result = await db.execute(sql`
    select p.slug, p.name,
      count(*) filter (where e.day >= ${day(period.from)}::date and e.day < ${day(period.to)}::date)::int as current,
      count(*) filter (where e.day >= ${day(prev.from)}::date and e.day < ${day(prev.to)}::date)::int as previous
    from product_events e
    join products p on p.id = e.product_id
    where e.type = ${type} and e.day >= ${day(prev.from)}::date and e.day < ${day(period.to)}::date
    group by p.id
    having count(*) filter (where e.day >= ${day(period.from)}::date and e.day < ${day(period.to)}::date) > 0
    order by current desc, p.name asc
    limit ${RANK_LIMIT}`);
  return result.rows as RankedProduct[];
}

export type EventTotals = Record<ProductEventType, { events: number; products: number }>;

export async function eventTotals(period: Period): Promise<EventTotals> {
  const result = await db.execute(sql`
    select type, count(*)::int as events, count(distinct product_id)::int as products
    from product_events
    where day >= ${day(period.from)}::date and day < ${day(period.to)}::date
    group by type`);
  const totals: EventTotals = {
    view: { events: 0, products: 0 },
    click: { events: 0, products: 0 },
    add_to_bag: { events: 0, products: 0 },
  };
  for (const r of result.rows as { type: ProductEventType; events: number; products: number }[]) {
    totals[r.type] = { events: Number(r.events), products: Number(r.products) };
  }
  return totals;
}

/** The first day anything was recorded, or null if tracking hasn't seen a visit yet. */
export async function trackingSince(): Promise<string | null> {
  const result = await db.execute(sql`select min(day)::text as since from product_events`);
  return (result.rows[0] as { since: string | null }).since;
}

export type SalesRank = {
  slug: string;
  name: string;
  units: number;
  orders: number;
  revenueCents: number;
};

/** Units in orders that reached Stripe (placed in the period), whatever happened next. */
export async function topCheckedOut(period: Period): Promise<SalesRank[]> {
  const result = await db.execute(sql`
    select oi.product_slug as slug, max(oi.product_name) as name,
      sum(oi.quantity)::int as units, count(distinct o.id)::int as orders,
      sum(oi.line_total_cents)::bigint as revenue_cents
    from order_items oi join orders o on o.id = oi.order_id
    where o.stripe_checkout_session_id is not null
      and o.created_at >= ${period.from.toISOString()}::timestamptz
      and o.created_at < ${period.to.toISOString()}::timestamptz
    group by oi.product_slug
    order by units desc, name asc
    limit ${RANK_LIMIT}`);
  return mapSales(result.rows);
}

/** Units paid in the period (by payment date), with their catalogue revenue. */
export async function topPurchased(period: Period): Promise<SalesRank[]> {
  const result = await db.execute(sql`
    select oi.product_slug as slug, max(oi.product_name) as name,
      sum(oi.quantity)::int as units, count(distinct o.id)::int as orders,
      sum(oi.line_total_cents)::bigint as revenue_cents
    from order_items oi join orders o on o.id = oi.order_id
    where o.status in ('paid', 'refunded')
      and o.paid_at >= ${period.from.toISOString()}::timestamptz
      and o.paid_at < ${period.to.toISOString()}::timestamptz
    group by oi.product_slug
    order by units desc, name asc
    limit ${RANK_LIMIT}`);
  return mapSales(result.rows);
}

function mapSales(rows: unknown[]): SalesRank[] {
  return (rows as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug),
    name: String(r.name),
    units: Number(r.units),
    orders: Number(r.orders),
    revenueCents: Number(r.revenue_cents),
  }));
}

export type ConversionRow = {
  slug: string;
  name: string;
  views: number;
  paidOrders: number;
  /** paidOrders ÷ views, same period, unattributed. */
  rate: number;
};

export const MIN_VIEWS_FOR_RATE = 20;

/**
 * Products with enough views to say something, by conversion: paid orders
 * containing the product divided by unique daily views, both in the period.
 * `lowest` lists the most-viewed products that sold least.
 */
export async function conversion(
  period: Period,
  order: "highest" | "lowest",
): Promise<ConversionRow[]> {
  const result = await db.execute(sql`
    with v as (
      select e.product_id, count(*)::int as views
      from product_events e
      where e.type = 'view' and e.day >= ${day(period.from)}::date and e.day < ${day(period.to)}::date
      group by e.product_id
      having count(*) >= ${MIN_VIEWS_FOR_RATE}
    ),
    s as (
      select oi.product_slug, count(distinct o.id)::int as paid_orders
      from order_items oi join orders o on o.id = oi.order_id
      where o.status in ('paid', 'refunded')
        and o.paid_at >= ${period.from.toISOString()}::timestamptz
        and o.paid_at < ${period.to.toISOString()}::timestamptz
      group by oi.product_slug
    )
    select p.slug, p.name, v.views, coalesce(s.paid_orders, 0)::int as paid_orders
    from v join products p on p.id = v.product_id
    left join s on s.product_slug = p.slug
    order by (coalesce(s.paid_orders, 0)::float / v.views) ${order === "highest" ? sql`desc` : sql`asc`},
      v.views desc
    limit ${RANK_LIMIT}`);
  return (result.rows as Record<string, unknown>[]).map((r) => {
    const views = Number(r.views);
    const paidOrders = Number(r.paid_orders);
    return { slug: String(r.slug), name: String(r.name), views, paidOrders, rate: paidOrders / views };
  });
}
