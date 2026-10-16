import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ShippingAddress } from "@/db/schema";
import { OrderLines, OrderLinesSkeleton } from "@/components/order-lines";
import { getOrder } from "@/lib/orders";
import { orderStatusCopy, orderStatusTone, type OrderDetail } from "@/lib/order-types";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order details — Atelier",
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
    </div>
  );
}

function statusDetail(order: OrderDetail): string {
  switch (order.status) {
    case "paid":
      return order.paidAt
        ? `Payment confirmed on ${longDate.format(order.paidAt)}. A receipt was sent to ${order.email}.`
        : `Payment confirmed. A receipt was sent to ${order.email}.`;
    case "pending":
      return "We're waiting for the payment to be confirmed. This usually takes a few seconds.";
    case "processing":
      return "Your bank is processing the payment, which can take a few days. We'll email you when it clears.";
    case "payment_failed":
      return "The payment didn't go through and nothing was charged. Your pieces are still in your bag if you'd like to try again.";
    case "expired":
      return "This checkout closed before it was paid. Nothing was charged.";
    case "cancelled":
      return "This checkout was replaced by a newer one. Nothing was charged on it.";
  }
}

function OrderFacts({ order }: { order: OrderDetail }) {
  const address = formatAddress(order.shippingAddress);
  const rows = [
    { label: "Confirmation sent to", value: [order.email] },
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

function formatAddress(address: ShippingAddress | null): string[] | null {
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
