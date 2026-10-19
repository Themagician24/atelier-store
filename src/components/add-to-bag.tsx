"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect } from "react";
import { addToBag } from "@/app/bag/actions";
import { setBagCount } from "@/components/session-provider";
import type { StockState } from "@/lib/stock";

/*
 * One piece per press. The server decides what fits: it caps the line at
 * live stock and says so. Disabled until a size is picked, and for a sold-out
 * size; made-to-order sizes stay addable.
 */
export function AddToBag({
  sku,
  stock,
}: {
  /** The chosen variant, or null until a size is picked. */
  sku: string | null;
  stock: StockState;
}) {
  const pathname = usePathname();
  const [state, action, pending] = useActionState(addToBag, null);
  const soldOut = sku !== null && stock === "sold-out";

  // The badge moves the moment the server confirms the add.
  useEffect(() => {
    if (state?.itemCount !== undefined) setBagCount(state.itemCount);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="sku" value={sku ?? ""} />
      <input type="hidden" name="next" value={pathname} />
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={sku === null || soldOut || pending}
      >
        {sku === null ? "Select a size" : soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
      </button>
      <p
        aria-live="polite"
        className={`min-h-6 text-ui ${state?.ok === false ? "text-alert" : "text-muted"}`}
      >
        {state && (
          <>
            {state.message}{" "}
            <Link href="/bag" className="link text-ink">
              View bag
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
