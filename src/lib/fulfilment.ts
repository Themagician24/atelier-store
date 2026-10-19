// Preparation and delivery, moved by an admin once the payment is confirmed.
// Pure: the admin action applies it as a guarded UPDATE, the pages word it.
import type { FulfilmentStatus, OrderStatus } from "@/db/schema";

/** The one step each status may move to. Delivery is the end. */
const NEXT: Record<FulfilmentStatus, FulfilmentStatus | null> = {
  unfulfilled: "preparing",
  preparing: "shipped",
  shipped: "delivered",
  delivered: null,
};

/**
 * Where an order may go next, or null. Only a paid order is prepared: a
 * pending, failed, expired, cancelled or refunded order never ships.
 */
export function nextFulfilment(
  payment: OrderStatus,
  current: FulfilmentStatus,
): FulfilmentStatus | null {
  if (payment !== "paid") return null;
  return NEXT[current];
}

export function canMoveFulfilment(
  payment: OrderStatus,
  current: FulfilmentStatus,
  to: FulfilmentStatus,
): boolean {
  return nextFulfilment(payment, current) === to;
}

export const fulfilmentCopy: Record<FulfilmentStatus, string> = {
  unfulfilled: "Not yet prepared",
  preparing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
};

/** The admin button for the next step. */
export const fulfilmentAction: Record<FulfilmentStatus, string> = {
  unfulfilled: "",
  preparing: "Mark as being prepared",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
};
