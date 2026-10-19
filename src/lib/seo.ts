// Structured data and indexing rules, built only from real catalogue data.
// Pure: no db, no env. Callers pass absolute URLs from src/lib/site.ts.
//
// Deliberately absent: AggregateRating and Review (the store has no
// reviews), and MerchantReturnPolicy (no published returns policy yet).
import type { StockState } from "@/lib/stock";

type JsonLd = Record<string, unknown>;

/** Serialises for a <script type="application/ld+json">, `<` escaped. */
export function jsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const availability: Record<StockState, string> = {
  "in-stock": "https://schema.org/InStock",
  "low-stock": "https://schema.org/LimitedAvailability",
  "made-to-order": "https://schema.org/MadeToOrder",
  "sold-out": "https://schema.org/OutOfStock",
};

export function schemaAvailability(stock: StockState): string {
  return availability[stock];
}

export type ProductForSeo = {
  slug: string;
  name: string;
  description: string;
  /** Whole dollars or cents as a decimal number, e.g. 420 or 99.99. */
  price: number;
  stock: StockState;
  category: { slug: string; name: string };
  images: { url: string }[];
  colours: string[];
  variants: { sku: string; colour: string; size: string; stock: StockState }[];
};

/** "420.00": schema.org prices are plain decimal strings, no symbol. */
function priceString(price: number): string {
  return price.toFixed(2);
}

// Free shipping, United States only: the store's actual rule (checkout.ts).
function shippingDetails(): JsonLd {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "USD" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
  };
}

/**
 * Product with one Offer per variant, each with its own SKU and live stock.
 * The price is the same for every variant (the catalogue prices products).
 */
export function productJsonLd(product: ProductForSeo, url: string, brand: string): JsonLd {
  const price = priceString(product.price);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url,
    sku: product.slug,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: brand },
    category: product.category.name,
    ...(product.colours.length === 1 ? { color: product.colours[0] } : {}),
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      sku: variant.sku,
      name: `${product.name}, ${variant.colour}, ${variant.size}`,
      url,
      price,
      priceCurrency: "USD",
      availability: schemaAvailability(variant.stock),
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: shippingDetails(),
    })),
  };
}

export type Crumb = { name: string; url: string };

export function breadcrumbJsonLd(crumbs: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function itemListJsonLd(name: string, urls: string[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url,
    })),
  };
}

export function organizationJsonLd(name: string, url: string): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name,
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name,
      url,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${url}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

/** A collection's meta description from what it actually holds. */
export function collectionDescription(name: string, pieceCount: number): string {
  const pieces = pieceCount === 1 ? "1 piece" : `${pieceCount} pieces`;
  return `${name} at Atelier: ${pieces}, made in small runs. Free shipping across the US.`;
}

/** Meta descriptions stay under ~160 characters, cut at a word. */
export function metaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,.;:]$/, "")}…`;
}

// --- Indexing ------------------------------------------------------------------

/** Private paths: never commercial pages, never in the sitemap. */
export const privatePaths = ["/account", "/admin", "/bag", "/checkout", "/api/"] as const;

/** Static public pages that belong in the sitemap. */
export const staticPublicPaths = ["/", "/new-arrivals", "/help/shipping", "/help/contact"] as const;

export function isIndexablePath(path: string): boolean {
  if (path.startsWith("/search") || path.startsWith("/sign-")) return false;
  return !privatePaths.some((p) => {
    const base = p.replace(/\/$/, "");
    return path === base || path.startsWith(`${base}/`);
  });
}
