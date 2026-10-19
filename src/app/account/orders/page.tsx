import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatCents } from "@/lib/format";
import { listOrders } from "@/lib/orders";
import { orderStatusCopy, orderStatusTone } from "@/lib/order-types";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false },
};

const placedOn = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function OrdersPage() {
  return (
    <section aria-labelledby="orders-title" className="flex max-w-reading flex-col gap-8">
      <h2 id="orders-title" className="text-title">
        Orders
      </h2>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrderList />
      </Suspense>
    </section>
  );
}

async function OrderList() {
  const user = await requireUser("/account/orders");
  const orders = await listOrders(user.id);

  if (orders.length === 0) {
    return (
      <>
        <p className="text-muted">You haven&rsquo;t placed an order yet.</p>
        <Link href="/new-arrivals" className="link-cta self-start">
          Shop new arrivals
        </Link>
      </>
    );
  }

  return (
    <ul className="border-t">
      {orders.map((order) => (
        <li key={order.reference} className="border-b">
          <Link
            href={`/account/orders/${order.reference}`}
            aria-label={`Order ${order.reference}, ${placedOn.format(order.createdAt)}, ${orderStatusCopy[order.status]}, ${formatCents(order.totalCents ?? order.subtotalCents)}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 py-5 sm:gap-x-6"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="eyebrow">{order.reference}</p>
              <p className="text-ui text-muted">
                {placedOn.format(order.createdAt)} · {order.itemCount}{" "}
                {order.itemCount === 1 ? "piece" : "pieces"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="tabular-nums">
                {formatCents(order.totalCents ?? order.subtotalCents)}
              </p>
              <p className={`text-ui ${orderStatusTone[order.status]}`}>
                {orderStatusCopy[order.status]}
              </p>
            </div>
            <svg
              viewBox="0 0 12 12"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              className="size-3 text-muted transition-transform duration-200 ease-standard group-hover:translate-x-0.5 group-hover:text-ink"
            >
              <path d="M4 2l4 4-4 4" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-busy="true" className="border-t">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex justify-between border-b py-5">
          <div className="h-5 w-32 bg-mist" />
          <div className="h-5 w-20 bg-mist" />
        </div>
      ))}
    </div>
  );
}
