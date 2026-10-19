"use client";

import Image from "next/image";
import Link from "next/link";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { removeFromBag, updateQuantity } from "@/app/bag/actions";
import { setBagCount } from "@/components/session-provider";
import { MAX_LINE_QUANTITY } from "@/lib/cart-math";
import type { BagLine as Line } from "@/lib/cart-types";
import { formatCents } from "@/lib/format";

type LineView = { quantity: number; removing: boolean };

/*
 * One bag line. Quantity and line total move the moment a button is pressed;
 * the server then re-caps the quantity and re-renders the page with the real
 * subtotal. The bounds here only disable buttons — they enforce nothing.
 */
export function BagLine({ line }: { line: Line }) {
  const { sku, name, maxQuantity, status, unitPriceCents } = line;
  const [pending, startTransition] = useTransition();
  const [view, setView] = useOptimistic<LineView, Partial<LineView>>(
    { quantity: line.quantity, removing: false },
    (current, next) => ({ ...current, ...next }),
  );

  function setQuantity(quantity: number) {
    startTransition(async () => {
      setView(quantity <= 0 ? { removing: true } : { quantity });
      const data = new FormData();
      data.set("sku", sku);
      data.set("quantity", String(quantity));
      setBagCount(await updateQuantity(data));
    });
  }

  function remove() {
    startTransition(async () => {
      setView({ removing: true });
      const data = new FormData();
      data.set("sku", sku);
      setBagCount(await removeFromBag(data));
    });
  }

  const { quantity, removing } = view;
  const unavailable = status === "unavailable";
  const href = `/products/${line.productSlug}`;
  const note = stockNote(line, quantity);
  // Two sizes of one piece are two lines: name them apart for screen readers.
  const label = `${name}, ${line.colour}, ${line.size}`;

  return (
    <div
      aria-busy={pending}
      className={`grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 transition-opacity duration-200 ease-standard sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6 ${removing ? "opacity-40" : ""}`}
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className={`media-frame block ${unavailable ? "opacity-50" : ""}`}
      >
        {line.image && <Image src={line.image.url} alt="" fill sizes="8rem" />}
      </Link>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-sans text-body">
            <Link href={href} className="link-quiet">
              {name}
            </Link>
          </h3>
          <p className={`shrink-0 tabular-nums ${unavailable ? "text-muted" : ""}`}>
            {unavailable ? (
              <span className="eyebrow">Unavailable</span>
            ) : (
              formatCents(unitPriceCents * quantity)
            )}
          </p>
        </div>

        <p className="mt-1 text-ui text-muted">
          {line.colour} · {line.size}
        </p>
        {!unavailable && quantity > 1 && (
          <p className="text-ui text-muted tabular-nums">
            {formatCents(unitPriceCents)} each
          </p>
        )}

        {note && (
          <p
            className={`mt-3 flex items-start gap-2 text-ui ${note.alert ? "text-alert" : "text-muted"}`}
          >
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 bg-current" />
            {note.text}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-4">
          {unavailable ? (
            <span />
          ) : (
            <div className="inline-flex items-center border">
              <StepButton
                label={quantity === 1 ? `Remove ${label}` : `Decrease quantity of ${label}`}
                disabled={removing}
                onClick={() => setQuantity(quantity - 1)}
              >
                <path d="M2 6h8" />
              </StepButton>
              <output
                aria-live="polite"
                aria-label={`Quantity of ${label}`}
                className="min-w-9 text-center text-ui tabular-nums"
              >
                {quantity}
              </output>
              <StepButton
                label={`Increase quantity of ${label}`}
                disabled={removing || quantity >= maxQuantity}
                onClick={() => setQuantity(quantity + 1)}
              >
                <path d="M2 6h8" />
                <path d="M6 2v8" />
              </StepButton>
            </div>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            aria-label={`Remove ${label}`}
            className="link-cta cursor-pointer text-muted disabled:cursor-default"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The one stock line worth showing, most urgent first. */
function stockNote(
  { status, stock, maxQuantity }: Line,
  quantity: number,
): { text: string; alert: boolean } | null {
  if (status === "unavailable") {
    return { text: "Sold out in this size. Remove it to continue.", alert: true };
  }
  if (status === "reduced") {
    return {
      text: `Only ${maxQuantity} left — we’ve lowered your quantity to match.`,
      alert: true,
    };
  }
  const atLimit = quantity >= maxQuantity;
  // Below the line limit, the cap is the stock itself.
  const stockBound = maxQuantity < MAX_LINE_QUANTITY;

  if (stock === "made-to-order") {
    return {
      text: atLimit
        ? `Made to order. Limit of ${MAX_LINE_QUANTITY} per piece.`
        : "Made to order. Cut and finished once you order.",
      alert: false,
    };
  }
  if (atLimit) {
    return stockBound
      ? {
          text: `You have the last ${maxQuantity === 1 ? "one" : maxQuantity}.`,
          alert: stock === "low-stock",
        }
      : { text: `Limit of ${MAX_LINE_QUANTITY} per piece.`, alert: false };
  }
  if (stock === "low-stock") {
    return { text: `Only ${maxQuantity} left.`, alert: true };
  }
  return null;
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-10 cursor-pointer items-center justify-center transition-colors duration-200 ease-standard hover:bg-mist disabled:cursor-default disabled:text-line disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
