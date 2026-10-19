import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderStatusEvents,
  user,
  type FulfilmentStatus,
  type OrderStatus,
  type ShippingAddress,
} from "@/db/schema";
import { auditEntry } from "@/lib/admin-audit";
import { canMoveFulfilment } from "@/lib/fulfilment";
import type { OrderLine } from "@/lib/order-types";

/*
 * The back office's view of orders. Payment status is read-only here: only
 * the Stripe webhook moves it (src/lib/orders.ts). The one write is the
 * fulfilment step, a guarded UPDATE logged in the status history and the
 * audit log. Callers have already called requireAdmin().
 */

export const ORDERS_PAGE_SIZE = 25;

export type AdminOrderQuery = {
  q: string;
  status: OrderStatus | null;
  fulfilment: FulfilmentStatus | null;
  flagged: boolean;
  from: Date | null;
  to: Date | null;
  page: number;
};

export type AdminOrderRow = {
  reference: string;
  createdAt: Date;
  customerName: string | null;
  email: string;
  status: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  totalCents: number | null;
  subtotalCents: number;
  refundedCents: number;
  itemCount: number;
  flagged: boolean;
};

function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function orderWhere(query: AdminOrderQuery): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    // Only checkouts that reached Stripe; an order that never got a session
    // is an aborted attempt, not an order.
    isNotNull(orders.stripeCheckoutSessionId),
  ];
  if (query.q) {
    const term = likeTerm(query.q);
    conditions.push(or(ilike(orders.reference, term), ilike(orders.email, term)));
  }
  if (query.status) conditions.push(eq(orders.status, query.status));
  if (query.fulfilment) conditions.push(eq(orders.fulfilmentStatus, query.fulfilment));
  if (query.flagged) {
    conditions.push(
      inArray(orders.status, ["paid", "refunded"]),
      or(eq(orders.amountMismatch, true), eq(orders.oversold, true)),
    );
  }
  if (query.from) conditions.push(gte(orders.createdAt, query.from));
  if (query.to) conditions.push(lt(orders.createdAt, query.to));
  return and(...conditions);
}

export async function listAdminOrders(
  query: AdminOrderQuery,
): Promise<{ rows: AdminOrderRow[]; total: number }> {
  const where = orderWhere(query);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        reference: orders.reference,
        createdAt: orders.createdAt,
        customerName: user.name,
        email: orders.email,
        status: orders.status,
        fulfilmentStatus: orders.fulfilmentStatus,
        totalCents: orders.totalCents,
        subtotalCents: orders.subtotalCents,
        refundedCents: orders.refundedCents,
        flagged: sql<boolean>`(${orders.amountMismatch} or ${orders.oversold})`,
        itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
      })
      .from(orders)
      .leftJoin(user, eq(user.id, orders.userId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(ORDERS_PAGE_SIZE)
      .offset((query.page - 1) * ORDERS_PAGE_SIZE),
    db.select({ total: count() }).from(orders).where(where),
  ]);
  return { rows, total };
}

export type AdminOrderDetail = {
  reference: string;
  status: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  email: string;
  customer: { id: string; name: string } | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number | null;
  refundedCents: number;
  currency: string;
  amountMismatch: boolean;
  oversold: boolean;
  /** Stripe ids: references for the Stripe Dashboard, not secrets. */
  stripePaymentIntentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  shippingAddress: ShippingAddress | null;
  items: OrderLine[];
  history: {
    kind: "payment" | "fulfilment";
    fromStatus: string;
    toStatus: string;
    source: "stripe" | "admin";
    actor: string | null;
    createdAt: Date;
  }[];
};

export async function getAdminOrder(reference: string): Promise<AdminOrderDetail | null> {
  const row = await db.query.orders.findFirst({
    where: eq(orders.reference, reference),
    with: {
      user: { columns: { id: true, name: true } },
      items: {
        columns: {
          sku: true,
          productSlug: true,
          productName: true,
          colour: true,
          size: true,
          imageUrl: true,
          unitPriceCents: true,
          quantity: true,
          lineTotalCents: true,
        },
      },
      statusEvents: {
        columns: { kind: true, fromStatus: true, toStatus: true, source: true, createdAt: true },
        orderBy: [asc(orderStatusEvents.createdAt)],
        with: { actor: { columns: { name: true } } },
      },
    },
  });
  if (!row) return null;
  return {
    reference: row.reference,
    status: row.status,
    fulfilmentStatus: row.fulfilmentStatus,
    email: row.email,
    customer: row.user,
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    totalCents: row.totalCents,
    refundedCents: row.refundedCents,
    currency: row.currency,
    amountMismatch: row.amountMismatch,
    oversold: row.oversold,
    stripePaymentIntentId: row.stripePaymentIntentId,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    refundedAt: row.refundedAt,
    shippedAt: row.shippedAt,
    deliveredAt: row.deliveredAt,
    shippingAddress: row.shippingAddress,
    items: row.items,
    history: row.statusEvents.map(({ actor, ...e }) => ({ ...e, actor: actor?.name ?? null })),
  };
}

/**
 * Moves fulfilment one step. The WHERE repeats the rule from fulfilment.ts
 * (paid, and still at `from`), so a double click or a refund that landed
 * meanwhile changes nothing. The status history is written in the same
 * statement; the audit entry follows once the move is known to have happened.
 */
export async function advanceFulfilment(
  actorId: string,
  reference: string,
  from: FulfilmentStatus,
  to: FulfilmentStatus,
): Promise<boolean> {
  if (!canMoveFulfilment("paid", from, to)) return false;
  const stamp =
    to === "shipped"
      ? sql`, shipped_at = now()`
      : to === "delivered"
        ? sql`, delivered_at = now()`
        : sql``;
  const result = await db.execute(sql`
    with moved as (
      update orders set fulfilment_status = ${to}, updated_at = now() ${stamp}
      where reference = ${reference} and status = 'paid' and fulfilment_status = ${from}
      returning id
    ),
    hist as (
      insert into order_status_events (order_id, kind, from_status, to_status, source, actor_user_id)
      select id, 'fulfilment', ${from}, ${to}, 'admin', ${actorId} from moved
    )
    select count(*)::int as moved from moved`);
  const moved = Number((result.rows[0] as { moved: number }).moved) > 0;
  if (moved) {
    await auditEntry(actorId, "order.fulfilment", "order", reference, { from, to });
  }
  return moved;
}
