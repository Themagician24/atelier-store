import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import {
  orderItems,
  orders,
  products,
  productVariants,
  stripeEvents,
  type ShippingAddress,
} from "@/db/schema";
import { CHECKOUT_CURRENCY, type CheckoutLine } from "@/lib/checkout-lines";
import {
  isCheckoutEvent,
  REFUNDABLE,
  transitionFor,
} from "@/lib/order-status";
import type { OrderDetail, OrderSummary } from "@/lib/order-types";
import { stripe } from "@/lib/stripe";

/*
 * The only module that touches `db` for orders. Orders are created `pending`
 * by startCheckout and moved on only by verified Stripe webhooks, through
 * applyCheckoutEvent. Pages read; they never write a status.
 */

// No 0/O or 1/I: references get read out over the phone.
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newReference(): string {
  let s = "AT-";
  for (let i = 0; i < 6; i++) {
    s += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return s;
}

/** A pending order and its snapshot lines, written in one batch. */
export async function createPendingOrder(
  user: { id: string; email: string },
  lines: CheckoutLine[],
  subtotalCents: number,
  shippingCents: number,
): Promise<{ id: string; reference: string }> {
  // Variant ids and made-to-order stay server-side: the bag speaks in SKUs.
  const variants = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      madeToOrder: products.madeToOrder,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      inArray(
        productVariants.sku,
        lines.map((l) => l.sku),
      ),
    );
  const bySku = new Map(variants.map((v) => [v.sku, v]));

  const id = randomUUID();
  const reference = newReference();
  await db.batch([
    db.insert(orders).values({
      id,
      reference,
      userId: user.id,
      email: user.email,
      status: "pending",
      currency: CHECKOUT_CURRENCY,
      subtotalCents,
      shippingCents,
    }),
    db.insert(orderItems).values(
      lines.map((l) => {
        const variant = bySku.get(l.sku);
        if (!variant) throw new Error(`Unknown SKU at checkout: ${l.sku}`);
        return {
          orderId: id,
          variantId: variant.id,
          sku: l.sku,
          productSlug: l.productSlug,
          productName: l.productName,
          colour: l.colour,
          size: l.size,
          imageUrl: l.imageUrl,
          madeToOrder: variant.madeToOrder,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          lineTotalCents: l.lineTotalCents,
        };
      }),
    ),
  ]);
  return { id, reference };
}

export async function attachCheckoutSession(
  orderId: string,
  sessionId: string,
  expiresAt: Date,
): Promise<void> {
  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId, expiresAt })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

/** Only from pending: a webhook that already moved it on wins. */
export async function cancelPendingOrder(orderId: string): Promise<void> {
  await db
    .update(orders)
    .set({ status: "cancelled" })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

/** The user's still-open checkouts, to close before opening another. */
export async function openOrders(userId: string) {
  return db
    .select({
      id: orders.id,
      stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")));
}

// --- Reads for pages ---------------------------------------------------------

// Every page read is scoped to the user: a session id or a reference in
// someone else's URL shows nothing, exactly as if it didn't exist.

export async function getOrderBySession(
  userId: string,
  sessionId: string,
): Promise<OrderDetail | null> {
  return findOrder(
    and(eq(orders.userId, userId), eq(orders.stripeCheckoutSessionId, sessionId)),
  );
}

export async function getOrder(
  userId: string,
  reference: string,
): Promise<OrderDetail | null> {
  return findOrder(and(eq(orders.userId, userId), eq(orders.reference, reference)));
}

async function findOrder(where: SQL | undefined): Promise<OrderDetail | null> {
  const row = await db.query.orders.findFirst({
    where,
    columns: {
      reference: true,
      status: true,
      email: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      createdAt: true,
      paidAt: true,
      shippingAddress: true,
      refundedCents: true,
      fulfilmentStatus: true,
      shippedAt: true,
      deliveredAt: true,
    },
    with: {
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
    },
  });
  return row ?? null;
}

/** Orders worth showing in history: anything that reached Stripe's payment. */
export async function listOrders(userId: string): Promise<OrderSummary[]> {
  return db
    .select({
      reference: orders.reference,
      status: orders.status,
      subtotalCents: orders.subtotalCents,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      // Qualified by hand: Drizzle renders single-table columns unqualified,
      // and a bare "id" inside the subquery would bind to order_items.id.
      itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        inArray(orders.status, ["processing", "paid", "payment_failed", "refunded"]),
        isNotNull(orders.stripeCheckoutSessionId),
      ),
    )
    .orderBy(desc(orders.createdAt));
}

// --- Webhook -----------------------------------------------------------------

/** `fulfilled`: the payment was confirmed and stock moved, so the catalogue is stale. */
export type EventOutcome = "applied" | "fulfilled" | "noop" | "duplicate" | "ignored";

function shippingAddressOf(
  session: Stripe.Checkout.Session,
): ShippingAddress | null {
  const details = session.collected_information?.shipping_details;
  if (!details) return null;
  const a = details.address;
  return {
    name: details.name ?? null,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postalCode: a.postal_code ?? null,
    country: a.country ?? null,
  };
}

/**
 * Applies one verified Checkout Session event. Idempotent three ways: the
 * stripe_events primary key, the `status in (…)` guard on every transition,
 * and the UNIQUE session id the order is matched on. Each event is one SQL
 * statement, so the event record, the status change, the stock decrement
 * and the bag clean-up commit together or not at all.
 */
export async function applyCheckoutEvent(
  event: Stripe.Event,
): Promise<EventOutcome> {
  if (!isCheckoutEvent(event.type)) return "ignored";

  // Fast path only: the guarded statement below is what makes replays safe.
  const [seen] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id));
  if (seen) return "duplicate";

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) return "ignored"; // Not a session this store created.

  const transition = transitionFor(event.type, session.payment_status);
  const recordEvent = sql`
    insert into stripe_events (id, type, stripe_created_at)
    values (${event.id}, ${event.type}, to_timestamp(${event.created}))
    on conflict (id) do nothing`;

  if (!transition) {
    await db.execute(recordEvent);
    return "noop";
  }

  const from = sql.join(
    transition.from.map((s) => sql`${s}`),
    sql`, `,
  );
  const match = sql`id = ${orderId}::uuid
    and stripe_checkout_session_id = ${session.id}
    and status in (${from})`;
  // The status before the change, for the history row. Same snapshot as the
  // update; the update's own guard is what decides whether anything moves.
  const prev = sql`prev as (
    select id as prev_id, status as prev_status from orders where ${match}
  )`;
  const history = (cte: string) => sql`
    insert into order_status_events
      (order_id, kind, from_status, to_status, source, stripe_event_id)
    select id, 'payment', prev_status, ${transition.to}, 'stripe', ${event.id}
    from ${sql.raw(cte)}`;

  if (!transition.fulfil) {
    const result = await db.execute(sql`
      with ev as (${recordEvent}),
      ${prev},
      moved as (
        update orders set status = ${transition.to}, updated_at = now()
        from prev
        where prev_id = orders.id and ${match}
        returning orders.id, prev_status
      ),
      hist as (${history("moved")})
      select count(*)::int as moved from moved`);
    return Number(result.rows[0]?.moved) > 0 ? "applied" : "noop";
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const address = shippingAddressOf(session);

  // Every CTE reads the same snapshot, so `oversold` compares against stock
  // as it was before this statement's own decrement.
  const result = await db.execute(sql`
    with ev as (${recordEvent}),
    ${prev},
    paid as (
      update orders set
        status = 'paid',
        paid_at = now(),
        updated_at = now(),
        total_cents = ${session.amount_total},
        shipping_cents = ${session.total_details?.amount_shipping ?? 0},
        stripe_payment_intent_id = ${paymentIntent},
        shipping_address = ${address ? JSON.stringify(address) : null}::jsonb,
        amount_mismatch =
          subtotal_cents <> ${session.amount_subtotal ?? -1}
          or currency <> ${session.currency ?? ""},
        oversold = exists (
          select 1 from order_items oi
          join product_variants v on v.id = oi.variant_id
          where oi.order_id = orders.id
            and not oi.made_to_order
            and v.stock_quantity < oi.quantity
        )
      from prev
      where prev_id = orders.id and ${match}
      returning orders.id as id, orders.user_id as user_id, prev_status
    ),
    hist as (${history("paid")}),
    stock as (
      -- Made-to-order pieces sell any ready stock first, then are made:
      -- they decrement too, and the floor absorbs the made part.
      update product_variants v
      set stock_quantity = greatest(v.stock_quantity - oi.quantity, 0)
      from order_items oi, paid
      where oi.order_id = paid.id
        and oi.variant_id = v.id
      returning v.id
    ),
    cleared as (
      delete from cart_items c
      using order_items oi, paid
      where oi.order_id = paid.id
        and c.user_id = paid.user_id
        and c.variant_id = oi.variant_id
      returning c.id
    )
    select
      (select count(*) from paid)::int as moved,
      (select count(*) from stock)::int as decremented,
      (select count(*) from cleared)::int as cleared`);
  return Number(result.rows[0]?.moved) > 0 ? "fulfilled" : "noop";
}

/**
 * Applies a verified `charge.refunded`. The order is found by its payment
 * intent; the rule is refundTransition() in src/lib/order-status.ts, written
 * here as one statement with the event record and the history row, so a
 * replay changes nothing (stripe_events PK, and greatest() never lowers the
 * refunded total).
 */
export async function applyRefundEvent(
  event: Stripe.Event,
): Promise<EventOutcome> {
  if (event.type !== "charge.refunded") return "ignored";

  const [seen] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id));
  if (seen) return "duplicate";

  const charge = event.data.object as Stripe.Charge;
  const paymentIntent =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);
  if (!paymentIntent) return "ignored";

  // The payment intent is written on the order when its payment is applied.
  // A refund can reach us first (the completed event still being retried
  // after an outage): recording it now would lose it for good. If Stripe says
  // the payment is one of ours, fail so Stripe retries once the order is
  // paid; a charge from anything else on the account is simply ignored.
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.stripePaymentIntentId, paymentIntent))
    .limit(1);
  if (!order) {
    const intent = await stripe().paymentIntents.retrieve(paymentIntent);
    if (intent.metadata?.orderId) {
      throw new Error(`Refund for order ${intent.metadata.orderId} arrived before its payment; retry`);
    }
    await db.execute(sql`
      insert into stripe_events (id, type, stripe_created_at)
      values (${event.id}, ${event.type}, to_timestamp(${event.created}))
      on conflict (id) do nothing`);
    return "ignored";
  }

  const refundable = sql.join(
    REFUNDABLE.map((s) => sql`${s}`),
    sql`, `,
  );
  const amountRefunded = Math.max(0, charge.amount_refunded);
  const full = charge.amount > 0 && amountRefunded >= charge.amount;

  const result = await db.execute(sql`
    with ev as (
      insert into stripe_events (id, type, stripe_created_at)
      values (${event.id}, ${event.type}, to_timestamp(${event.created}))
      on conflict (id) do nothing
    ),
    prev as (
      select id as prev_id, status as prev_status, refunded_cents as prev_refunded
      from orders
      where stripe_payment_intent_id = ${paymentIntent}
        and status in (${refundable})
    ),
    moved as (
      -- refunded_at is when Stripe made this refund, so period reports date
      -- the latest refund correctly. amount_refunded is cumulative; if a
      -- refund later fails Stripe lowers it, which greatest() deliberately
      -- ignores: that rare case is corrected by hand in Stripe and here.
      update orders set
        refunded_cents = greatest(refunded_cents, ${amountRefunded}::int),
        refunded_at = to_timestamp(${event.created}),
        status = case when ${full}::boolean then 'refunded' else status end,
        updated_at = now()
      from prev
      where prev_id = orders.id and status in (${refundable})
        and greatest(refunded_cents, ${amountRefunded}::int) > prev_refunded
      returning orders.id as id, prev_status, orders.status as to_status
    ),
    hist as (
      insert into order_status_events
        (order_id, kind, from_status, to_status, source, stripe_event_id)
      select id, 'payment', prev_status, to_status, 'stripe', ${event.id}
      from moved
      where prev_status <> to_status
    )
    select count(*)::int as moved from moved`);
  return Number(result.rows[0]?.moved) > 0 ? "applied" : "noop";
}
