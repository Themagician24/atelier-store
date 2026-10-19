import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { applyCheckoutEvent, applyRefundEvent } from "@/lib/orders";
import { stripe, webhookSecret } from "@/lib/stripe";

// The only place an order becomes paid. Stripe sends no cookie, so this route
// stays out of src/proxy.ts; the signature is its authentication.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The raw body, byte for byte: parsing it first breaks the signature.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret());
  } catch (error) {
    console.warn("Stripe webhook signature rejected", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const outcome =
      event.type === "charge.refunded"
        ? await applyRefundEvent(event)
        : await applyCheckoutEvent(event);
    // Stock just moved: the catalogue's cached stock states are out of date.
    if (outcome === "fulfilled") revalidateTag("products", "max");
    return Response.json({ received: true, outcome });
  } catch (error) {
    // 500 makes Stripe retry; the event is only recorded once applied.
    console.error(`Stripe webhook ${event.id} (${event.type}) failed`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
