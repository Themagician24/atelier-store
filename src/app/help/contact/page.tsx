import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph, supportEmail } from "@/lib/site";
import { HelpPage } from "../help-page";

const description =
  "Contact Atelier client services about an order, a piece or your account.";

export const metadata: Metadata = {
  title: "Contact us",
  description,
  alternates: { canonical: "/help/contact" },
  openGraph: pageOpenGraph({ path: "/help/contact", title: "Contact us", description }),
};

// The address comes from SUPPORT_EMAIL. Without it, the page says so plainly
// rather than showing an address nobody reads.
export default function ContactPage() {
  const email = supportEmail();

  return (
    <HelpPage eyebrow="Contact us" title="Contact us">
      {email ? (
        <section className="flex flex-col gap-3">
          <h2>Write to us</h2>
          <p>
            Email{" "}
            <a href={`mailto:${email}`} className="link text-ink">
              {email}
            </a>
            .
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2>Write to us</h2>
          <p>
            Our client services address is being set up. In the meantime, your
            order details and status are always available in your account.
          </p>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2>About an order</h2>
        <p>
          Include your order reference (it starts with AT-). You&rsquo;ll find
          it on your confirmation page and in{" "}
          <Link href="/account/orders" className="link text-ink">
            your orders
          </Link>
          .
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2>Shipping</h2>
        <p>
          Delivery is free across the United States.{" "}
          <Link href="/help/shipping" className="link text-ink">
            How shipping works
          </Link>
          .
        </p>
      </section>
    </HelpPage>
  );
}
