import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBag } from "@/lib/cart";
import type { Bag } from "@/lib/cart-types";
import { formatCents } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { BagLine } from "./bag-line";
import { CheckoutButton } from "./checkout-button";

// What startCheckout or Stripe's cancel_url sent the customer back with.
const checkoutNotices = {
  stock:
    "Stock changed while you were shopping. Your bag now matches what we have — check it before paying.",
  cancelled: "Checkout cancelled. Your bag is just as you left it.",
  error: "We couldn't open checkout. Nothing was charged — please try again.",
} as const;

type CheckoutNotice = keyof typeof checkoutNotices;

function readNotice(raw: string | string[] | undefined): CheckoutNotice | null {
  return typeof raw === "string" && raw in checkoutNotices
    ? (raw as CheckoutNotice)
    : null;
}

export const metadata: Metadata = {
  title: "Your bag — Atelier",
  robots: { index: false },
};

// Header and title are the static shell; the bag is request-time and
// streams in behind Suspense.
export default function BagPage({ searchParams }: PageProps<"/bag">) {
  return (
    <>
      <SiteHeader />
      <main className="shell flex flex-1 flex-col py-section">
        <h1 className="text-display mb-10 md:mb-14">Your bag</h1>
        <Suspense fallback={<BagSkeleton />}>
          <BagContents searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function BagContents({
  searchParams,
}: {
  searchParams: PageProps<"/bag">["searchParams"];
}) {
  const user = await requireUser("/bag");
  const [bag, params] = await Promise.all([getBag(user.id), searchParams]);
  const notice = readNotice(params.checkout);

  if (bag.lines.length === 0) {
    return (
      <>
        {notice && <Notice notice={notice} />}
        <EmptyBag />
      </>
    );
  }

  return (
    <>
      {notice && <Notice notice={notice} />}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="pieces-title">
          <h2 id="pieces-title" className="sr-only">
            Pieces
          </h2>
          <ul className="border-t">
            {bag.lines.map((line) => (
              <li key={line.sku} className="border-b py-6">
                <BagLine line={line} />
              </li>
            ))}
          </ul>
        </section>

        <Summary bag={bag} />
      </div>
    </>
  );
}

function Notice({ notice }: { notice: CheckoutNotice }) {
  return (
    <p
      role="status"
      className={`mb-8 border p-4 text-ui ${notice === "cancelled" ? "text-muted" : "border-alert text-alert"}`}
    >
      {checkoutNotices[notice]}
    </p>
  );
}

function Summary({ bag }: { bag: Bag }) {
  const unavailable = bag.lines.filter((l) => l.status === "unavailable").length;
  const reduced = bag.lines.filter((l) => l.status === "reduced").length;

  return (
    <aside
      aria-labelledby="summary-title"
      className="flex flex-col gap-6 self-start lg:sticky lg:top-[calc(var(--header-height)+2rem)]"
    >
      <h2 id="summary-title" className="eyebrow text-muted">
        Summary
      </h2>

      {(unavailable > 0 || reduced > 0) && (
        <div role="status" className="flex flex-col gap-1 border border-alert p-4 text-ui text-alert">
          {unavailable > 0 && (
            <p>
              {unavailable === 1 ? "One piece is" : `${unavailable} pieces are`} no
              longer available and not included in your subtotal.
            </p>
          )}
          {reduced > 0 && (
            <p>
              Stock changed on {reduced === 1 ? "one piece" : `${reduced} pieces`}:
              quantities now match what we have.
            </p>
          )}
        </div>
      )}

      <dl className="border-t">
        <div className="flex items-baseline justify-between gap-4 border-b py-4">
          <dt className="text-muted">Shipping</dt>
          <dd className="text-muted">Free</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-5">
          <dt>
            <span className="eyebrow">Subtotal</span>{" "}
            <span className="text-ui text-muted">
              · {bag.itemCount} {bag.itemCount === 1 ? "piece" : "pieces"}
            </span>
          </dt>
          <dd className="text-lead tabular-nums">{formatCents(bag.subtotalCents)}</dd>
        </div>
      </dl>

      <p className="text-ui text-muted">
        Prices and availability are confirmed when you check out. Items in
        your bag are not reserved.
      </p>

      <CheckoutButton disabled={bag.itemCount === 0} />

      <Link href="/new-arrivals" className="btn btn-secondary btn-block">
        Continue shopping
      </Link>
    </aside>
  );
}

function EmptyBag() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 border-t py-section text-center">
      <p className="eyebrow text-muted">Nothing here yet</p>
      <h2 className="text-title">Your bag is empty</h2>
      <p className="max-w-reading text-muted">
        Pieces you add are kept here, on any device you sign in from.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/new-arrivals" className="btn btn-primary">
          Shop new arrivals
        </Link>
        <Link href="/" className="btn btn-secondary">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}

/** Same columns and line rhythm as the loaded bag. */
function BagSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_26rem]"
    >
      <div aria-hidden="true" className="border-t">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 border-b py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6"
          >
            <div className="media-frame" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-48 max-w-full bg-mist" />
              <div className="h-4 w-28 bg-mist" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="h-4 w-20 bg-mist" />
        <div className="h-40 bg-mist" />
      </div>
    </div>
  );
}
