// Collection filters and sort, read from the query string. Pure: applied to
// the cached category read, so filtering never adds a database query and an
// unknown value simply has no effect.
import type { StockState } from "@/lib/stock";

export const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortOption = (typeof sortOptions)[number]["value"];

export type CatalogueFilters = {
  colour: string | null;
  size: string | null;
  inStock: boolean;
  sort: SortOption;
};

type FilterableProduct = {
  price: number;
  stock: StockState;
  colours: string[];
  variants: { colour: string; size: string; stock: StockState }[];
};

type Params = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v.length > 0 && v.length <= 60 ? v : null;
}

export function parseFilters(params: Params): CatalogueFilters {
  const sort = one(params.sort);
  return {
    colour: one(params.colour),
    size: one(params.size),
    inStock: one(params.stock) === "in",
    sort: sortOptions.some((o) => o.value === sort) ? (sort as SortOption) : "newest",
  };
}

export function hasActiveFilters(f: CatalogueFilters): boolean {
  return f.colour !== null || f.size !== null || f.inStock || f.sort !== "newest";
}

const buyable = (stock: StockState) => stock !== "sold-out";

/**
 * Products matching every filter. Colour and size match on one variant
 * together, so "Black, M, in stock" means a black M that can be bought.
 */
export function applyFilters<P extends FilterableProduct>(
  products: readonly P[],
  f: CatalogueFilters,
): P[] {
  const matched = products.filter((p) =>
    p.variants.some(
      (v) =>
        (f.colour === null || v.colour === f.colour) &&
        (f.size === null || v.size === f.size) &&
        (!f.inStock || buyable(v.stock)),
    ),
  );
  if (f.sort === "newest") return matched; // Already newest first.
  const dir = f.sort === "price-asc" ? 1 : -1;
  // Stable: equal prices keep their newest-first order.
  return matched
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.price - b.p.price) * dir || a.i - b.i)
    .map(({ p }) => p);
}

/** The colours and sizes actually on offer in this set, for the menus. */
export function facets(products: readonly FilterableProduct[]): {
  colours: string[];
  sizes: string[];
} {
  const colours = new Set<string>();
  const sizes = new Set<string>();
  for (const p of products) {
    for (const v of p.variants) {
      colours.add(v.colour);
      sizes.add(v.size);
    }
  }
  return {
    colours: [...colours].sort((a, b) => a.localeCompare(b)),
    sizes: [...sizes].sort(compareSizes),
  };
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "One size"];

/** Letter sizes in wearing order, then numbers ascending, then the rest. */
export function compareSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}
