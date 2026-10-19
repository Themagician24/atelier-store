"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// The webhook usually lands within seconds of Stripe's redirect. Re-render
// the server page a few times so the customer sees "paid" without reloading;
// once the page leaves `pending` this component unmounts and polling stops.
// After that, the order page has the answer.
const INTERVAL_MS = 2500;
const ATTEMPTS = 12;

// Without a reference (already on the order page) there is nowhere better
// to send the customer, so giving up only says to check back.
export function AwaitConfirmation({ reference }: { reference?: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= ATTEMPTS) {
        window.clearInterval(id);
        setGaveUp(true);
      }
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  if (gaveUp && !reference) {
    return (
      <p role="status" className="text-ui text-muted">
        This is taking longer than usual. Your payment may still be on its
        way — check back in a few minutes.
      </p>
    );
  }

  if (gaveUp) {
    return (
      <p role="status" className="border p-4 text-ui text-muted">
        This is taking longer than usual. Your payment may still be on its way;{" "}
        <Link href={`/account/orders/${reference}`} className="link text-ink">
          your order page
        </Link>{" "}
        will show the result as soon as it lands.
      </p>
    );
  }

  return (
    <p role="status" className="flex items-center gap-3 text-ui text-muted">
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 animate-pulse bg-current motion-reduce:animate-none"
      />
      This page updates on its own.
    </p>
  );
}
