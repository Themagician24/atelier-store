import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/site";
import { HelpPage } from "../help-page";

// Only what the store actually does: free shipping, United States only, paid
// through Stripe at checkout (src/lib/checkout.ts). No delivery times are
// promised here because none are set in the system.
const description =
  "Shipping at Atelier: free on every order, delivered to addresses in the United States. How payment and order updates work.";

export const metadata: Metadata = {
  title: "Shipping",
  description,
  alternates: { canonical: "/help/shipping" },
  openGraph: pageOpenGraph({ path: "/help/shipping", title: "Shipping", description }),
};

export default function ShippingPage() {
  return (
    <HelpPage eyebrow="Shipping" title="Shipping">
      <section className="flex flex-col gap-3">
        <h2>Free, on every order</h2>
        <p>
          Shipping is free whatever you order. There is no minimum and nothing
          is added at checkout.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2>Where we deliver</h2>
        <p>
          We currently deliver to addresses in the United States only. Your
          shipping address is collected securely at checkout.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2>Payment and confirmation</h2>
        <p>
          Payment is taken by Stripe at checkout. Your order is confirmed only
          once Stripe confirms the payment; some payment methods take a few
          days to clear, and your order page shows where it stands.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2>Following your order</h2>
        <p>
          Every order has a page in{" "}
          <Link href="/account/orders" className="link text-ink">
            your account
          </Link>{" "}
          showing its payment status and when it is prepared, shipped and
          delivered.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2>Questions</h2>
        <p>
          For anything about an order, including returns,{" "}
          <Link href="/help/contact" className="link text-ink">
            contact client services
          </Link>{" "}
          with your order reference.
        </p>
      </section>
    </HelpPage>
  );
}
