"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { getBag, reconcileBag } from "@/lib/cart";
import {
  CHECKOUT_CURRENCY,
  checkoutSubtotal,
  needsReview,
  SHIPPING_CENTS,
  toCheckoutLines,
  toStripeLineItems,
} from "@/lib/checkout-lines";
import {
  attachCheckoutSession,
  cancelPendingOrder,
  createPendingOrder,
  openOrders,
} from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { siteOrigin, stripe } from "@/lib/stripe";

// Short enough that price and stock can't drift far; Stripe's minimum is 30.
const SESSION_MINUTES = 60;

/** Dashboard label for this flow, with the 8-letter suffix Stripe asks for. */
function integrationIdentifier(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += letters[randomInt(letters.length)];
  return `atelier-bag-${suffix}`;
}

/**
 * Closes the user's earlier open checkouts so two tabs can't both be paid.
 * If Stripe refuses (already completed or expired), the order is left for
 * the webhook to settle — it may have just been paid.
 */
async function closeOpenCheckouts(userId: string): Promise<void> {
  for (const order of await openOrders(userId)) {
    if (!order.stripeCheckoutSessionId) {
      await cancelPendingOrder(order.id);
      continue;
    }
    try {
      await stripe().checkout.sessions.expire(order.stripeCheckoutSessionId);
      await cancelPendingOrder(order.id);
    } catch {
      // Not open any more: the webhook owns what happens to it.
    }
  }
}

/**
 * The bag's "Checkout" button posts here with an empty form: every amount
 * is rebuilt from a fresh read of the database, never from the browser.
 */
export async function startCheckout(): Promise<void> {
  const user = await requireUser("/bag");
  const bag = await getBag(user.id);

  if (bag.lines.length === 0) redirect("/bag");

  // Stock check #1, blocking: if anything changed since the bag was shown,
  // save the correction and let the customer look before paying.
  if (needsReview(bag.lines)) {
    await reconcileBag(user.id, bag.lines);
    redirect("/bag?checkout=stock");
  }

  const lines = toCheckoutLines(bag.lines);
  const subtotalCents = checkoutSubtotal(lines);

  await closeOpenCheckouts(user.id);
  const order = await createPendingOrder(user, lines, subtotalCents, SHIPPING_CENTS);

  const origin = siteOrigin();
  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: toStripeLineItems(lines),
        client_reference_id: order.id,
        metadata: { orderId: order.id, reference: order.reference, userId: user.id },
        payment_intent_data: {
          metadata: { orderId: order.id, reference: order.reference },
        },
        customer_email: user.email,
        shipping_address_collection: { allowed_countries: ["US"] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: SHIPPING_CENTS, currency: CHECKOUT_CURRENCY },
              display_name: "Free shipping",
            },
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/bag?checkout=cancelled`,
        integration_identifier: integrationIdentifier(),
      },
      { idempotencyKey: `checkout:${order.id}` },
    );
    await attachCheckoutSession(order.id, session.id, new Date(session.expires_at * 1000));
    url = session.url;
  } catch (error) {
    console.error("Checkout session creation failed", error);
    await cancelPendingOrder(order.id);
  }

  // redirect() throws, so it stays outside the try.
  redirect(url ?? "/bag?checkout=error");
}
