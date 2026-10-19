// Wording of /checkout/success for each real order status. Pure, so the
// page and the tests share it. The status is whatever the webhook wrote:
// arriving on the page proves nothing about payment.
import type { OrderStatus } from "@/db/schema";
import { firstName } from "@/lib/display-name";

/**
 * The name to thank: the account's first name, else the first word of the
 * name Stripe collected for shipping, else nobody in particular.
 */
export function thankYouName(
  accountName: string | null | undefined,
  shippingName: string | null | undefined,
): string | null {
  return firstName(accountName) ?? firstName(shippingName);
}

export function confirmationHeading(status: OrderStatus, name: string | null): string {
  switch (status) {
    case "paid":
      return name ? `Thank you, ${name}` : "Thank you for your order";
    case "pending":
      return "Confirming your payment";
    case "processing":
      return "Your payment is processing";
    case "payment_failed":
      return "Your payment didn't go through";
    case "refunded":
      return "This order was refunded";
    default:
      return "This checkout is closed";
  }
}

export function confirmationLead(status: OrderStatus): string {
  switch (status) {
    case "paid":
      return "Your payment is confirmed and your order is in. Follow its progress from your account at any time.";
    case "pending":
      return "This usually takes a few seconds. You can stay on this page.";
    case "processing":
      return "Your bank is processing the payment, which can take a few days. Your order page will update when it clears; your pieces stay in your bag until then.";
    case "payment_failed":
      return "Nothing was charged. Your pieces are still in your bag if you'd like to try another payment method.";
    case "refunded":
      return "The full amount has been returned to your original payment method.";
    default:
      return "Nothing was charged on this checkout. Your bag is still there.";
  }
}

/** The steps after a paid order. Only what the store actually does. */
export const nextSteps = [
  {
    title: "Confirmed",
    body: "Your payment is received and your order is recorded.",
  },
  {
    title: "Prepared",
    body: "Your pieces are checked and carefully packed.",
  },
  {
    title: "On its way",
    body: "Your order page shows the moment it ships.",
  },
] as const;
