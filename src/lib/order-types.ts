// Order shapes, kept out of src/lib/orders.ts so client components can
// import them without pulling a server-only module into the bundle.
import type {
  FulfilmentStatus,
  OrderStatus,
  ShippingAddress,
} from "@/db/schema";

export type OrderLine = {
  sku: string;
  productSlug: string;
  productName: string;
  colour: string;
  size: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type OrderDetail = {
  reference: string;
  status: OrderStatus;
  email: string;
  subtotalCents: number;
  shippingCents: number;
  /** Stripe's amount_total; null until the payment is confirmed. */
  totalCents: number | null;
  createdAt: Date;
  paidAt: Date | null;
  /** Collected by Stripe; null until the payment is confirmed. */
  shippingAddress: ShippingAddress | null;
  /** Cumulative, from Stripe charge.refunded events. */
  refundedCents: number;
  fulfilmentStatus: FulfilmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  items: OrderLine[];
};

export type OrderSummary = {
  reference: string;
  status: OrderStatus;
  subtotalCents: number;
  totalCents: number | null;
  createdAt: Date;
  itemCount: number;
};

/** Customer-facing wording for each status. */
export const orderStatusCopy: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  processing: "Payment processing",
  paid: "Paid",
  payment_failed: "Payment failed",
  expired: "Checkout expired",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const orderStatusTone: Record<OrderStatus, string> = {
  pending: "text-muted",
  processing: "text-muted",
  paid: "text-ink",
  payment_failed: "text-alert",
  expired: "text-muted",
  cancelled: "text-muted",
  refunded: "text-muted",
};

/** Stripe's collected address as display lines, or null if there's nothing to show. */
export function formatAddress(address: ShippingAddress | null): string[] | null {
  if (!address) return null;
  const cityLine = [
    address.city,
    [address.state, address.postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const lines = [address.name, address.line1, address.line2, cityLine].filter(
    (l): l is string => Boolean(l),
  );
  return lines.length > 0 ? lines : null;
}
