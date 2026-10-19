import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AwaitConfirmation } from "@/app/checkout/success/await-confirmation";
import { OrderLines, OrderLinesSkeleton } from "@/components/order-lines";
import { formatCents } from "@/lib/format";
import { fulfilmentCopy } from "@/lib/fulfilment";
import { getOrder } from "@/lib/orders";
import {
  formatAddress,
  orderStatusCopy,
  orderStatusTone,
  type OrderDetail,
} from "@/lib/order-types";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

const longDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// AT- plus six characters from the reference alphabet; anything else is
// rejected before it reaches the database.
const REFERENCE_PATTERN = /^AT-[2-9A-HJ-NP-Z]{6}$/;

// The back link is static chrome; the order itself is request-time and
// streams in behind Suspense, with the reference read inside the boundary.
export default function OrderPage({ params }: PageProps<"/account/orders/[reference]">) {
  return (
    <div className="flex max-w-reading flex-col gap-8">
      <Link href="/account/orders" className="link-cta self-start text-muted">
        <span aria-hidden="true">←</span> All orders
      </Link>
      <Suspense fallback={<OrderSkeleton />}>
        <Order params={params} />
      </Suspense>
    </div>
  );
}

async function Order({
  params,
}: {
  params: PageProps<"/account/orders/[reference]">["params"];
}) {
  const { reference } = await params;
  const user = await requireUser(`/account/orders/${encodeURIComponent(reference)}`);
  // Scoped to the signed-in customer: someone else's reference is a 404.
  const order = REFERENCE_PATTERN.test(reference)
    ? await getOrder(user.id, reference)
    : null;
  if (!order) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <h2 className="text-title">Order {order.reference}</h2>
        <p className="text-ui text-muted">Placed {longDate.format(order.createdAt)}</p>
      </header>

      <StatusPanel order={order} />

      <OrderLines order={order} titleId="order-items-title" title="Pieces" />

      <OrderFacts order={order} />

      <p className="text-muted">
        Questions about this order? Contact{" "}
        <Link href="/help/contact" className="link text-ink">
          client services
        </Link>{" "}
        and quote {order.reference}.
      </p>
    </>
  );
}

/** The current state in words, with what it means for the customer. */
function StatusPanel({ order }: { order: OrderDetail }) {
  const alert = order.status === "payment_failed";
  return (
    <div
      role="status"
      className={`flex flex-col gap-1 border p-4 ${alert ? "border-alert" : ""}`}
    >
      <p className={`eyebrow ${orderStatusTone[order.status]}`}>
        {orderStatusCopy[order.status]}
      </p>
      <p className="text-ui text-muted">{statusDetail(order)}</p>
      {/* Re-reads the order until the webhook moves it on. */}
      {order.status === "pending" && (
        <div className="mt-2">
          <AwaitConfirmation />
        </div>
      )}
    </div>
  );
}

function statusDetail(order: OrderDetail): string {
  switch (order.status) {
    case "paid":
      return order.paidAt
        ? `Payment confirmed on ${longDate.format(order.paidAt)}.`
        : "Payment confirmed.";
    case "pending":
      return "We're waiting for the payment to be confirmed. This usually takes a few seconds.";
    case "processing":
      return "Your bank is processing the payment, which can take a few days. This page updates when it clears.";
    case "payment_failed":
      return "The payment didn't go through and nothing was charged. Your pieces are still in your bag if you'd like to try again.";
    case "expired":
      return "This checkout closed before it was paid. Nothing was charged.";
    case "cancelled":
      return "This checkout was replaced by a newer one. Nothing was charged on it.";
    case "refunded":
      return "This order was refunded in full to your original payment method.";
  }
}

function OrderFacts({ order }: { order: OrderDetail }) {
  const address = formatAddress(order.shippingAddress);
  const rows = [
    ...(order.status === "paid"
      ? [{ label: "Delivery status", value: [deliveryLine(order)] }]
      : []),
    ...(order.refundedCents > 0
      ? [{ label: "Refunded", value: [formatCents(order.refundedCents)] }]
      : []),
    { label: "Account email", value: [order.email] },
    ...(address ? [{ label: "Shipping to", value: address }] : []),
  ];

  return (
    <dl className="border-t">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1 border-b py-5">
          <dt className="eyebrow text-muted">{row.label}</dt>
          <dd className="wrap-anywhere">
            {row.value.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function deliveryLine(order: OrderDetail): string {
  const label = fulfilmentCopy[order.fulfilmentStatus];
  const at =
    order.fulfilmentStatus === "delivered"
      ? order.deliveredAt
      : order.fulfilmentStatus === "shipped"
        ? order.shippedAt
        : null;
  return at ? `${label} on ${longDate.format(at)}` : label;
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="h-9 w-56 max-w-full bg-mist" />
        <div className="h-4 w-36 bg-mist" />
      </div>
      <div aria-hidden="true" className="h-20 bg-mist" />
      <OrderLinesSkeleton />
    </div>
  );
}
