import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, productImages, products, productVariants } from "@/db/schema";
import { clampQuantity, maxQuantity, subtotalCents } from "@/lib/cart-math";
import type { Bag, BagLine } from "@/lib/cart-types";
import { stockState } from "@/lib/stock";

/*
 * The only module that touches `db` for the bag, as src/lib/products.ts is
 * for the catalogue. Every query is scoped to the caller's userId, which the
 * actions take from the session, never from the form. Request-time only:
 * nothing here is cached.
 */

async function findVariant(sku: string) {
  const [row] = await db
    .select({
      id: productVariants.id,
      stockQuantity: productVariants.stockQuantity,
      madeToOrder: products.madeToOrder,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(productVariants.sku, sku))
    .limit(1);
  return row ?? null;
}

export type AddResult =
  | { ok: false; reason: "unknown" | "sold-out" }
  | { ok: true; added: number; quantity: number; max: number };

/**
 * Adds `requested` of a variant, capped at what is available now. The cap is
 * applied in SQL on the upsert, so two quick adds can't push past it.
 */
export async function addLine(
  userId: string,
  sku: string,
  requested: number,
): Promise<AddResult> {
  const variant = await findVariant(sku);
  if (!variant) return { ok: false, reason: "unknown" };

  const max = maxQuantity(variant);
  const quantity = clampQuantity(requested, max);
  if (quantity === 0) return { ok: false, reason: "sold-out" };

  // One round trip, run in order: the read only words the message.
  const [before, after] = await db.batch([
    db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(
        and(eq(cartItems.userId, userId), eq(cartItems.variantId, variant.id)),
      ),
    db
      .insert(cartItems)
      .values({ userId, variantId: variant.id, quantity })
      .onConflictDoUpdate({
        target: [cartItems.userId, cartItems.variantId],
        set: {
          quantity: sql`least(${cartItems.quantity} + excluded.quantity, ${max})`,
          updatedAt: new Date(),
        },
      })
      .returning({ quantity: cartItems.quantity }),
  ]);

  const previous = Math.min(before[0]?.quantity ?? 0, max);
  const now = after[0].quantity;
  return { ok: true, added: now - previous, quantity: now, max };
}

/** Sets a line to `requested`, capped by stock; 0 or less removes it. */
export async function setLineQuantity(
  userId: string,
  sku: string,
  requested: number,
): Promise<void> {
  const variant = await findVariant(sku);
  if (!variant) return;

  const quantity = clampQuantity(requested, maxQuantity(variant));
  const where = and(
    eq(cartItems.userId, userId),
    eq(cartItems.variantId, variant.id),
  );
  if (quantity === 0) {
    await db.delete(cartItems).where(where);
  } else {
    await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(where);
  }
}

export async function removeLine(userId: string, sku: string): Promise<void> {
  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.userId, userId),
        inArray(
          cartItems.variantId,
          db
            .select({ id: productVariants.id })
            .from(productVariants)
            .where(eq(productVariants.sku, sku)),
        ),
      ),
    );
}

/**
 * Saves what getBag() only displayed: reduced lines take their capped
 * quantity, unavailable ones leave the bag. Checkout calls this before
 * sending the customer back to review, so the bag they see is the bag
 * they will pay for.
 */
export async function reconcileBag(userId: string, lines: BagLine[]): Promise<void> {
  const unavailable = lines.filter((l) => l.status === "unavailable").map((l) => l.sku);
  const reduced = lines.filter((l) => l.status === "reduced");
  if (unavailable.length === 0 && reduced.length === 0) return;

  const variantIds = (skus: string[]) =>
    db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(inArray(productVariants.sku, skus));

  await db.batch([
    db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          inArray(cartItems.variantId, variantIds(unavailable.length ? unavailable : [""])),
        ),
      ),
    ...reduced.map((l) =>
      db
        .update(cartItems)
        .set({ quantity: l.quantity, updatedAt: new Date() })
        .where(
          and(
            eq(cartItems.userId, userId),
            inArray(cartItems.variantId, variantIds([l.sku])),
          ),
        ),
    ),
  ]);
}

/**
 * The bag with live prices and stock. Reads never write: a line whose stock
 * fell is shown capped (or unavailable) and saved on the next change.
 */
export async function getBag(userId: string): Promise<Bag> {
  const rows = await db.query.cartItems.findMany({
    where: eq(cartItems.userId, userId),
    orderBy: [asc(cartItems.createdAt)],
    columns: { quantity: true },
    with: {
      variant: {
        columns: { sku: true, colour: true, size: true, stockQuantity: true },
        with: {
          product: {
            columns: {
              slug: true,
              name: true,
              priceCents: true,
              madeToOrder: true,
            },
            with: {
              images: {
                columns: { url: true, alt: true, colour: true },
                orderBy: [asc(productImages.position)],
              },
            },
          },
        },
      },
    },
  });

  const lines = rows.map(({ quantity: stored, variant }): BagLine => {
    const { product } = variant;
    const max = maxQuantity({
      stockQuantity: variant.stockQuantity,
      madeToOrder: product.madeToOrder,
    });
    const quantity = Math.min(stored, max);
    // The photo of this colour, else the packshot that stands in for all.
    const image =
      product.images.find((i) => i.colour === variant.colour) ??
      product.images.find((i) => i.colour === null) ??
      product.images[0];

    return {
      sku: variant.sku,
      productSlug: product.slug,
      name: product.name,
      colour: variant.colour,
      size: variant.size,
      image: image ? { url: image.url, alt: image.alt } : null,
      unitPriceCents: product.priceCents,
      quantity,
      maxQuantity: max,
      status:
        quantity === 0 ? "unavailable" : quantity < stored ? "reduced" : "ok",
      stock: stockState({
        stockQuantity: variant.stockQuantity,
        madeToOrder: product.madeToOrder,
      }),
    };
  });

  return {
    lines,
    subtotalCents: subtotalCents(lines),
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
  };
}
