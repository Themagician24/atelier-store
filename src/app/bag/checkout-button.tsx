"use client";

import { useFormStatus } from "react-dom";
import { startCheckout } from "@/lib/checkout";

// An empty form on purpose: the server rebuilds every amount from the bag.
export function CheckoutButton({ disabled }: { disabled: boolean }) {
  return (
    <form action={startCheckout} className="flex flex-col gap-3">
      <SubmitButton disabled={disabled} />
      <p className="text-center text-ui text-muted">
        You&rsquo;ll pay on Stripe&rsquo;s secure page and can come back to
        your bag at any time.
      </p>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn btn-primary btn-block"
    >
      {pending ? "Opening secure checkout…" : "Checkout"}
    </button>
  );
}
