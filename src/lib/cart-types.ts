// Bag shapes, kept out of src/lib/cart.ts so client components can import
// them without pulling a server-only module into the bundle.
import type { StockState } from "@/lib/stock";

/**
 * - ok: the stored quantity is still available.
 * - reduced: stock fell below it; `quantity` is already capped.
 * - unavailable: none left; shown so it can be removed, not counted.
 */
export type BagLineStatus = "ok" | "reduced" | "unavailable";

export type BagLine = {
  sku: string;
  productSlug: string;
  name: string;
  colour: string;
  size: string;
  image: { url: string; alt: string } | null;
  /** Live from products.price_cents. */
  unitPriceCents: number;
  /** What the bag holds now: the stored quantity capped by `maxQuantity`. */
  quantity: number;
  maxQuantity: number;
  status: BagLineStatus;
  /** Live stock of this exact variant, in the catalogue's four states. */
  stock: StockState;
};

export type Bag = {
  lines: BagLine[];
  /** Sum over available lines only. */
  subtotalCents: number;
  /** Pieces counted in the subtotal. */
  itemCount: number;
};

export type CartActionState = {
  ok: boolean;
  message: string;
  /** Pieces in the bag after the action, for the header badge. */
  itemCount?: number;
} | null;
