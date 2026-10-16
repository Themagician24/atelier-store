// Pure order state machine, shared by the webhook (which applies it in SQL)
// and the tests. No imports beyond types: safe anywhere.
import type { OrderStatus } from "@/db/schema";

/**
 * What a Checkout Session event does to an order. `fulfil` means the payment
 * is confirmed: stock is decremented and the bag cleared, once.
 */
export type OrderTransition = {
  /** The only statuses this event may move an order out of. */
  from: readonly OrderStatus[];
  to: OrderStatus;
  fulfil: boolean;
};

export type CheckoutEvent =
  | "checkout.session.completed"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  | "checkout.session.expired";

export const checkoutEvents: readonly CheckoutEvent[] = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

export function isCheckoutEvent(type: string): type is CheckoutEvent {
  return (checkoutEvents as readonly string[]).includes(type);
}

/**
 * Statuses a confirmed payment may move to `paid`. `cancelled` is included:
 * if a customer pays an older session in the moment we replace it, the money
 * has been taken and the order must say so.
 */
const PAYABLE: readonly OrderStatus[] = ["pending", "processing", "cancelled"];

/**
 * The transition for an event, or null when it changes nothing. A completed
 * session can still be `unpaid` (bank debits and other delayed methods): that
 * only marks the order `processing` until async_payment_succeeded/failed.
 * Stripe's `no_payment_required` never happens here (every bag has a price).
 */
export function transitionFor(
  event: CheckoutEvent,
  paymentStatus: string,
): OrderTransition | null {
  switch (event) {
    case "checkout.session.completed":
      if (paymentStatus === "paid") {
        return { from: PAYABLE, to: "paid", fulfil: true };
      }
      if (paymentStatus === "unpaid") {
        return { from: ["pending"], to: "processing", fulfil: false };
      }
      return null;
    case "checkout.session.async_payment_succeeded":
      return { from: PAYABLE, to: "paid", fulfil: true };
    case "checkout.session.async_payment_failed":
      return { from: ["processing"], to: "payment_failed", fulfil: false };
    case "checkout.session.expired":
      return { from: ["pending"], to: "expired", fulfil: false };
  }
}

/** Where an order in `current` ends up after `transition` (itself if no-op). */
export function applyTransition(
  current: OrderStatus,
  transition: OrderTransition | null,
): OrderStatus {
  if (!transition || !transition.from.includes(current)) return current;
  return transition.to;
}
