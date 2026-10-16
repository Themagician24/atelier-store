import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderLines, OrderLinesSkeleton } from "@/components/order-lines";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getOrderBySession } from "@/lib/orders";
import type { OrderDetail } from "@/lib/order-types";
import { requireUser } from "@/lib/session";
import { AwaitConfirmation } from "./await-confirmation";

export const metadata: Metadata = {
  title: "Thank you — Atelier",
  robots: { index: false },
};

// Read-only: arriving here proves nothing about payment. The status shown is
// whatever the webhook has written, which may land a moment after the redirect.
export default function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  return (
    <>
      <SiteHeader />
      <main className="shell flex flex-1 flex-col py-section">
        <Suspense fallback={<ConfirmationSkeleton />}>
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Confirmation({
  searchParams,
}: {
  searchParams: PageProps<"/checkout/success">["searchParams"];
}) {
  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" ? session_id : "";
  const user = await requireUser(
    `/checkout/success?session_id=${encodeURIComponent(sessionId)}`,
  );
  const order = sessionId.startsWith("cs_")
    ? await getOrderBySession(user.id, sessionId)
    : null;

  if (!order) return <NotFound />;

  // Only `pending` resolves in seconds; `processing` waits on the bank for days.
  const awaiting = order.status === "pending";

  return (
    <div className="flex max-w-reading flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-muted">Order {order.reference}</p>
        <h1 className="text-display">{heading(order)}</h1>
        <p className="text-lead text-muted">{lead(order)}</p>
      </header>

      {awaiting && <AwaitConfirmation reference={order.reference} />}

      <OrderLines order={order} titleId="order-lines-title" />

      <div className="flex flex-wrap gap-3">
        <Link href={`/account/orders/${order.reference}`} className="btn btn-primary">
          View order details
        </Link>
        {order.status === "paid" ? (
          <Link href="/new-arrivals" className="btn btn-secondary">
            Continue shopping
          </Link>
        ) : (
          <Link href="/bag" className="btn btn-secondary">
            Back to your bag
          </Link>
        )}
      </div>
    </div>
  );
}

function heading(order: OrderDetail): string {
  switch (order.status) {
    case "paid":
      return "Thank you";
    case "pending":
      return "Confirming your payment";
    case "processing":
      return "Your payment is processing";
    case "payment_failed":
      return "Your payment didn't go through";
    default:
      return "This checkout is closed";
  }
}

function lead(order: OrderDetail): string {
  switch (order.status) {
    case "paid":
      return `Your order is confirmed. A receipt is on its way to ${order.email}.`;
    case "pending":
      return "This usually takes a few seconds. You can stay on this page.";
    case "processing":
      return "Your bank is processing the payment, which can take a few days. We'll email you when it clears; your pieces stay in your bag until then.";
    case "payment_failed":
      return "Nothing was charged. Your pieces are still in your bag if you'd like to try another payment method.";
    default:
      return "Nothing was charged on this checkout. Your bag is still there.";
  }
}

function NotFound() {
  return (
    <div className="flex max-w-reading flex-col gap-6">
      <h1 className="text-display">We can&rsquo;t find this order</h1>
      <p className="text-muted">
        If you just paid, your confirmation is in your account and by email.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/account/orders" className="btn btn-primary">
          View your orders
        </Link>
        <Link href="/bag" className="btn btn-secondary">
          Back to your bag
        </Link>
      </div>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div aria-busy="true" className="flex max-w-reading flex-col gap-10">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="h-4 w-32 bg-mist" />
        <div className="h-12 w-72 max-w-full bg-mist" />
        <div className="h-6 w-96 max-w-full bg-mist" />
      </div>
      <OrderLinesSkeleton />
    </div>
  );
}
