// Pure: turns a freshly read bag into Stripe line items and the order_items
// snapshot, from the same numbers. Nothing here comes from the browser.
import type Stripe from "stripe";
import type { BagLine } from "@/lib/cart-types";

export const CHECKOUT_CURRENCY = "usd";

/** Shipping is free; the rate exists so Stripe shows it and collects an address. */
export const SHIPPING_CENTS = 0;

export type CheckoutLine = {
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

/** Lines that can be bought now. `reduced` lines are not: they need a look. */
export function purchasableLines(lines: BagLine[]): BagLine[] {
  return lines.filter((l) => l.status === "ok" && l.quantity > 0);
}

/** True when the bag must go back to the customer before payment. */
export function needsReview(lines: BagLine[]): boolean {
  return lines.some((l) => l.status !== "ok");
}

export function toCheckoutLines(lines: BagLine[]): CheckoutLine[] {
  return purchasableLines(lines).map((l) => ({
    sku: l.sku,
    productSlug: l.productSlug,
    productName: l.name,
    colour: l.colour,
    size: l.size,
    imageUrl: l.image?.url ?? null,
    unitPriceCents: l.unitPriceCents,
    quantity: l.quantity,
    lineTotalCents: l.unitPriceCents * l.quantity,
  }));
}

export function checkoutSubtotal(lines: CheckoutLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
}

/** Stripe only accepts absolute https images; anything else is left out. */
function stripeImages(url: string | null): string[] | undefined {
  return url && url.startsWith("https://") ? [url] : undefined;
}

export function toStripeLineItems(
  lines: CheckoutLine[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: CHECKOUT_CURRENCY,
      unit_amount: l.unitPriceCents,
      product_data: {
        name: l.productName,
        description: `${l.colour} · ${l.size}`,
        images: stripeImages(l.imageUrl),
        metadata: { sku: l.sku },
      },
    },
  }));
}
