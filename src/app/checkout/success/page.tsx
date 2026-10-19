import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderLines, OrderLinesSkeleton } from "@/components/order-lines";
import { BagCountSync } from "@/components/session-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  confirmationHeading,
  confirmationLead,
  nextSteps as steps,
  thankYouName,
} from "@/lib/confirmation-copy";
import { bagItemCount } from "@/lib/cart";
import { formatCents } from "@/lib/format";
import { getOrderBySession } from "@/lib/orders";
import {
  formatAddress,
  orderStatusCopy,
  type OrderDetail,
} from "@/lib/order-types";
import { requireUser } from "@/lib/session";
import { AwaitConfirmation } from "./await-confirmation";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

const longDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Staggers .confirm-rise children; the mark draws first. */
const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

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

  const paid = order.status === "paid";
  const name = thankYouName(user.name, order.shippingAddress?.name);
  // Only `pending` resolves in seconds; `processing` waits on the bank for days.
  const awaiting = order.status === "pending";
  // The webhook clears the bought lines when it marks the order paid; the
  // header read the count before that, so push the emptied bag once it has.
  const bagCount = paid ? await bagItemCount(user.id) : null;

  return (
    <>
      {bagCount !== null && <BagCountSync count={bagCount} />}
      <header className="mx-auto flex max-w-reading flex-col items-center gap-5 text-center">
        {paid && <ConfirmMark />}
        <p className="confirm-rise eyebrow text-muted" style={rise(150)}>
          Order {order.reference}
        </p>
        <h1 className="confirm-rise text-display" style={rise(250)}>
          {confirmationHeading(order.status, name)}
        </h1>
        <p
          className={`confirm-rise text-lead ${order.status === "payment_failed" ? "text-alert" : "text-muted"}`}
          style={rise(350)}
        >
          {confirmationLead(order.status)}
        </p>
        {awaiting && (
          <div className="confirm-rise" style={rise(450)}>
            <AwaitConfirmation reference={order.reference} />
          </div>
        )}
      </header>

      <div
        className="confirm-rise mt-[calc(var(--section)*0.75)] grid gap-12 border-t pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_26rem]"
        style={rise(500)}
      >
        <OrderLines order={order} titleId="order-lines-title" title="Your pieces" />

        <aside
          aria-label="Order information"
          className="flex flex-col gap-10 self-start lg:sticky lg:top-[calc(var(--header-height)+2rem)]"
        >
          <OrderFacts order={order} />
          {paid && <NextSteps />}

          <div className="flex flex-col gap-3">
            <Link
              href={`/account/orders/${order.reference}`}
              className="btn btn-primary btn-block"
            >
              View order details
            </Link>
            {paid ? (
              <Link href="/new-arrivals" className="btn btn-secondary btn-block">
                Continue shopping
              </Link>
            ) : (
              <Link href="/bag" className="btn btn-secondary btn-block">
                Back to your bag
              </Link>
            )}
            <p className="mt-2 text-ui text-muted">
              Questions about this order?{" "}
              <Link href="/help/contact" className="link text-ink">
                Contact us
              </Link>{" "}
              and quote {order.reference}.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

/** Thin ink ring and tick, drawn on arrival. */
function ConfirmMark() {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      className="confirm-mark mb-3 size-14"
    >
      <circle cx="28" cy="28" r="27" transform="rotate(-90 28 28)" style={{ "--draw-length": "170" } as CSSProperties} />
      <path
        d="m19 28.5 6 6 12-13"
        strokeLinecap="square"
        style={{ "--draw-length": "27" } as CSSProperties}
      />
    </svg>
  );
}

function OrderFacts({ order }: { order: OrderDetail }) {
  const address = formatAddress(order.shippingAddress);
  const rows = [
    { label: "Payment", value: [orderStatusCopy[order.status]] },
    ...(order.totalCents !== null
      ? [{ label: "Total paid", value: [formatCents(order.totalCents)] }]
      : []),
    { label: "Placed", value: [longDate.format(order.createdAt)] },
    { label: "Account email", value: [order.email] },
    ...(address ? [{ label: "Shipping to", value: address }] : []),
    {
      label: "Delivery",
      value: [order.shippingCents === 0 ? "Free shipping" : "Standard shipping"],
    },
  ];

  return (
    <section aria-labelledby="order-facts-title">
      <h2 id="order-facts-title" className="eyebrow mb-4 text-muted">
        Details
      </h2>
      <dl className="border-t">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 border-b py-4">
            <dt className="text-ui text-muted">{row.label}</dt>
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
    </section>
  );
}

/** What happens after a paid order: the first step is already done. */
function NextSteps() {
  return (
    <section aria-labelledby="next-steps-title">
      <h2 id="next-steps-title" className="eyebrow mb-5 text-muted">
        What happens next
      </h2>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const done = i === 0;
          const last = i === steps.length - 1;
          return (
            <li key={step.title} className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-x-4">
              <span aria-hidden="true" className="flex flex-col items-center">
                <span
                  className={`mt-[0.4rem] size-2 shrink-0 border border-ink ${done ? "bg-ink" : ""}`}
                />
                {!last && <span className="mt-1.5 w-px flex-1 bg-line" />}
              </span>
              <div className={last ? "" : "pb-6"}>
                <p className={done ? "text-ink" : "text-ink-soft"}>
                  {step.title}
                  {done && <span className="sr-only"> (done)</span>}
                </p>
                <p className="mt-1 text-ui text-muted">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-reading flex-col items-center gap-5 text-center">
      <h1 className="text-display">We can&rsquo;t find this order</h1>
      <p className="text-lead text-muted">
        If you just paid, your confirmation is in your account and by email.
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
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

/** Same frame as the loaded page, so nothing shifts when it streams in. */
function ConfirmationSkeleton() {
  return (
    <div aria-busy="true">
      <div aria-hidden="true" className="mx-auto flex max-w-reading flex-col items-center gap-5">
        <div className="mb-3 size-14 rounded-full bg-mist" />
        <div className="h-4 w-32 bg-mist" />
        <div className="h-14 w-80 max-w-full bg-mist" />
        <div className="h-6 w-96 max-w-full bg-mist" />
      </div>
      <div className="mt-[calc(var(--section)*0.75)] grid gap-12 border-t pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <OrderLinesSkeleton />
        <div aria-hidden="true" className="flex flex-col gap-4">
          <div className="h-4 w-20 bg-mist" />
          <div className="h-48 bg-mist" />
        </div>
      </div>
    </div>
  );
}
