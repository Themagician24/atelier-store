import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { getAdminOrder } from "@/lib/admin-orders";
import { formatCents } from "@/lib/format";
import { fulfilmentAction, fulfilmentCopy, nextFulfilment } from "@/lib/fulfilment";
import { formatAddress, orderStatusCopy, orderStatusTone } from "@/lib/order-types";
import { requireAdmin } from "@/lib/session";
import { moveFulfilment } from "../actions";

export const metadata: Metadata = { title: "Order" };

const REFERENCE = /^AT-[2-9A-HJ-NP-Z]{6}$/;

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default function AdminOrderPage({ params, searchParams }: PageProps<"/admin/orders/[reference]">) {
  return (
    <section className="flex flex-col gap-8">
      <Link href="/admin/orders" className="link-cta self-start text-muted">
        <span aria-hidden="true">←</span> All orders
      </Link>
      <Suspense fallback={<div aria-busy="true" className="h-64 bg-mist" />}>
        <Order params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Order({
  params,
  searchParams,
}: Pick<PageProps<"/admin/orders/[reference]">, "params" | "searchParams">) {
  await requireAdmin("/admin/orders");
  const [{ reference }, { fulfilment }] = await Promise.all([params, searchParams]);
  const order = REFERENCE.test(reference) ? await getAdminOrder(reference) : null;
  if (!order) notFound();

  const next = nextFulfilment(order.status, order.fulfilmentStatus);
  const address = formatAddress(order.shippingAddress);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h2 className="text-title">Order {order.reference}</h2>
        <p className="text-ui text-muted">Placed {dateTime.format(order.createdAt)} UTC</p>
      </header>

      {fulfilment === "moved" && (
        <p role="status" className="border-l-2 border-ink pl-4">
          Preparation status updated.
        </p>
      )}
      {fulfilment === "stale" && (
        <p role="alert" className="border-l-2 border-alert pl-4 text-alert">
          Nothing changed: the order had already moved on, or is no longer paid.
        </p>
      )}
      {(order.amountMismatch || order.oversold) && (
        <p role="alert" className="border border-alert p-4 text-ui">
          {order.amountMismatch &&
            "Stripe charged a different subtotal or currency than the order recorded. Check the payment in Stripe before shipping. "}
          {order.oversold &&
            "Stock had run out for at least one piece when this payment landed (two checkouts at once). Check stock before preparing it."}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="items-title" className="flex flex-col gap-4">
          <h3 id="items-title" className="eyebrow text-muted">
            Pieces
          </h3>
          <table className="w-full text-left text-ui">
            <thead>
              <tr className="border-b text-muted">
                <th scope="col" className="py-2 font-normal">Piece</th>
                <th scope="col" className="py-2 text-right font-normal">Qty</th>
                <th scope="col" className="py-2 text-right font-normal">Unit</th>
                <th scope="col" className="py-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.sku} className="border-b align-top">
                  <td className="py-3">
                    {i.productName}
                    <span className="block text-muted">
                      {i.colour} · {i.size} · {i.sku}
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-3 text-right tabular-nums">{formatCents(i.unitPriceCents)}</td>
                  <td className="py-3 text-right tabular-nums">{formatCents(i.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="tabular-nums">
              <tr>
                <th scope="row" colSpan={3} className="pt-3 text-right font-normal text-muted">Subtotal</th>
                <td className="pt-3 text-right">{formatCents(order.subtotalCents)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3} className="text-right font-normal text-muted">Shipping</th>
                <td className="text-right">{order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3} className="text-right font-normal">Charged by Stripe</th>
                <td className="text-right">{order.totalCents === null ? "—" : formatCents(order.totalCents)}</td>
              </tr>
              {order.refundedCents > 0 && (
                <tr>
                  <th scope="row" colSpan={3} className="text-right font-normal text-muted">Refunded</th>
                  <td className="text-right">−{formatCents(order.refundedCents)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </section>

        <aside aria-label="Order status" className="flex flex-col gap-8">
          <dl className="flex flex-col gap-4 text-ui">
            <div>
              <dt className="eyebrow text-muted">Payment</dt>
              <dd className={orderStatusTone[order.status]}>{orderStatusCopy[order.status]}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Preparation</dt>
              <dd>{order.status === "paid" ? fulfilmentCopy[order.fulfilmentStatus] : "Not applicable until paid"}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Customer</dt>
              <dd>
                {order.customer ? (
                  <Link href={`/admin/customers/${order.customer.id}`} className="link">
                    {order.customer.name}
                  </Link>
                ) : (
                  "Deleted account"
                )}
                <span className="block text-muted">{order.email}</span>
              </dd>
            </div>
            {address && (
              <div>
                <dt className="eyebrow text-muted">Ship to</dt>
                <dd>
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                  {order.shippingAddress?.country && (
                    <span className="block">{order.shippingAddress.country}</span>
                  )}
                </dd>
              </div>
            )}
            {order.stripePaymentIntentId && (
              <div>
                <dt className="eyebrow text-muted">Stripe payment</dt>
                <dd className="wrap-anywhere text-muted">{order.stripePaymentIntentId}</dd>
              </div>
            )}
          </dl>

          {next && (
            <form action={moveFulfilment}>
              <input type="hidden" name="reference" value={order.reference} />
              <input type="hidden" name="from" value={order.fulfilmentStatus} />
              <input type="hidden" name="to" value={next} />
              <ConfirmButton
                question={`${fulfilmentAction[next]} for ${order.reference}? The customer's order page will show it.`}
                tone="primary"
              >
                {fulfilmentAction[next]}
              </ConfirmButton>
            </form>
          )}
        </aside>
      </div>

      <section aria-labelledby="history-title" className="flex max-w-reading flex-col gap-4 border-t pt-6">
        <h3 id="history-title" className="eyebrow text-muted">
          History (UTC)
        </h3>
        <ol className="flex flex-col gap-2 text-ui">
          <li>
            <span className="tabular-nums text-muted">{dateTime.format(order.createdAt)}</span> · Checkout started
          </li>
          {order.history.map((h, i) => (
            <li key={i}>
              <span className="tabular-nums text-muted">{dateTime.format(h.createdAt)}</span> ·{" "}
              {h.kind === "payment" ? "Payment" : "Preparation"}: {h.fromStatus} → {h.toStatus}{" "}
              <span className="text-muted">
                ({h.source === "stripe" ? "Stripe webhook" : `by ${h.actor ?? "a former admin"}`})
              </span>
            </li>
          ))}
          {order.history.length === 0 && (
            <li className="text-muted">No status change recorded yet.</li>
          )}
        </ol>
      </section>
    </>
  );
}
