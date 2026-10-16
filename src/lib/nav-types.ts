import type { StockState } from "@/lib/stock";

/*
 * What the header's menus and search need, trimmed from `Product` so the
 * whole catalogue can ship to the client. Kept out of src/lib/products.ts so
 * client components never import a `server-only` module.
 */

export type NavProduct = {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  colours: string[];
  price: number;
  compareAt: number | null;
  stock: StockState;
  /** The packshot. */
  image: { url: string; alt: string };
};

export type NavSection = {
  /** Unique per section; doubles as the React key. */
  slug: string;
  label: string;
  href: string;
  /** Pieces in this section, newest first. */
  products: NavProduct[];
  /** All pieces the section holds, which may exceed `products`. */
  pieceCount: number;
};

export type Navigation = {
  sections: NavSection[];
  /** Every piece, newest first: the search index. */
  products: NavProduct[];
};
