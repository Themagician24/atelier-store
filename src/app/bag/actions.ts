"use server";

import { refresh } from "next/cache";
import { addLine, removeLine, setLineQuantity } from "@/lib/cart";
import { MAX_LINE_QUANTITY } from "@/lib/cart-math";
import type { CartActionState } from "@/lib/cart-types";
import { requireUser, safeNext } from "@/lib/session";

// Every action reads the user from the session and passes only a SKU and a
// quantity on; src/lib/cart.ts re-caps the quantity against live stock.

function readSku(formData: FormData): string | null {
  const sku = formData.get("sku");
  return typeof sku === "string" && sku.length > 0 && sku.length <= 64
    ? sku
    : null;
}

function readQuantity(formData: FormData, fallback: number): number {
  const raw = formData.get("quantity");
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) ? n : fallback;
}

/** Product page: signed-out visitors go to sign-in and come back. */
export async function addToBag(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const user = await requireUser(safeNext(formData.get("next"), "/bag"));
  const sku = readSku(formData);
  if (!sku) return { ok: false, message: "Choose a size first." };

  const result = await addLine(user.id, sku, readQuantity(formData, 1));
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "sold-out"
          ? "This size is sold out."
          : "This piece is no longer available.",
    };
  }
  if (result.added === 0) {
    return {
      ok: false,
      message:
        result.max === MAX_LINE_QUANTITY
          ? `Your bag already holds the limit of ${MAX_LINE_QUANTITY}.`
          : `Your bag already holds all ${result.max} available.`,
    };
  }
  return {
    ok: true,
    message:
      result.quantity === result.max && result.max < MAX_LINE_QUANTITY
        ? `Added. You have the last ${result.quantity === 1 ? "one" : result.quantity} in your bag.`
        : "Added to your bag.",
  };
}

export async function updateQuantity(formData: FormData): Promise<void> {
  const user = await requireUser("/bag");
  const sku = readSku(formData);
  if (!sku) return;
  await setLineQuantity(user.id, sku, readQuantity(formData, 1));
  refresh();
}

export async function removeFromBag(formData: FormData): Promise<void> {
  const user = await requireUser("/bag");
  const sku = readSku(formData);
  if (!sku) return;
  await removeLine(user.id, sku);
  refresh();
}
