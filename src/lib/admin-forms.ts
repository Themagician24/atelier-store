// Pure parsing and validation for the admin forms. No imports beyond types:
// the Server Actions run it on every submit, the tests run it directly. The
// browser's own checks are a convenience; this is the one that counts.

/** A choice in the product form's category picker. */
export type CategoryOption = { slug: string; name: string };

/** Field name → message, shown under the field it belongs to. */
export type FieldErrors = Partial<Record<string, string>>;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

/** What the form posted, echoed back so a rejected submit loses nothing. */
export type FormValues = Record<string, string>;

/** Shared shape of every admin form's useActionState. */
export type AdminFormState = {
  errors: FieldErrors;
  /** Form-level message, for failures that belong to no single field. */
  message: string | null;
  values: FormValues;
  /** Bumped on each rejected submit so the form remounts with `values`. */
  attempt: number;
} | null;

// --- Primitives -------------------------------------------------------------

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 80;

/** "Tapered Crêpe Trousers" → "tapered-crepe-trousers". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/** Same rule as scripts/seed.ts, so new SKUs read like the seeded ones. */
export function skuPart(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function variantSku(productSlug: string, colour: string, size: string): string {
  return [productSlug, colour, size].map(skuPart).join("-");
}

// src/app/bag/actions.ts rejects anything longer.
export const SKU_MAX = 64;

/** Stripe won't charge less than 50 cents in USD. */
export const MIN_PRICE_CENTS = 50;
const MAX_PRICE_CENTS = 100_000_000; // $1,000,000

/**
 * Dollars as typed ("1,250", "1250.5", "$1250.50") → integer cents, or null
 * when it isn't an amount. Parsed as text, never through a float.
 */
export function parseCents(raw: string): number | null {
  const s = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents <= MAX_PRICE_CENTS ? cents : null;
}

/** 12050 → "120.50", for a form's default value. */
export function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** A comma-separated list, trimmed, blanks dropped, in the order typed. */
export function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One entry per non-blank line. */
export function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every string field of a FormData, for echoing back. Files are skipped. */
export function formValues(fd: FormData): FormValues {
  const values: FormValues = {};
  for (const [key, value] of fd) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

// next/image only has a loader for Unsplash (src/lib/image-loader.ts): any
// other host would throw on the storefront.
const IMAGE_HOST = "images.unsplash.com";

function isCatalogueImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === IMAGE_HOST;
  } catch {
    return false;
  }
}

/** "12" → 12; anything but digits from 0 to `max` → null. Never negative. */
export function wholeNumber(raw: string, max: number): number | null {
  const s = raw.trim();
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n <= max ? n : null;
}

// --- Product ----------------------------------------------------------------

/** The editable product fields: details, category, price and availability. */
export type ProductDetailsInput = {
  name: string;
  categorySlug: string;
  priceCents: number;
  compareAtCents: number | null;
  madeToOrder: boolean;
  stockDetail: string | null;
  description: string;
  details: string[];
  care: string;
  /** Total stock at or below this reads as low (storefront and admin). */
  lowStockThreshold: number;
};

/**
 * Creation adds what is fixed once the product exists: its public slug, the
 * colour × size grid its SKUs are built from, and the packshot.
 */
export type NewProductInput = ProductDetailsInput & {
  slug: string;
  variants: { sku: string; colour: string; size: string; position: number }[];
  initialStock: number;
  packshot: { url: string; alt: string };
};

const LIMITS = {
  name: 120,
  stockDetail: 200,
  description: 2000,
  care: 500,
  detailLines: 20,
  detailLine: 200,
  alt: 200,
  listItem: 30,
  sizes: 12,
  colours: 8,
  stock: 9999,
  threshold: 999,
};

function parseDetails(fd: FormData, errors: FieldErrors): ProductDetailsInput {
  const name = text(fd, "name");
  if (!name) errors.name = "Enter a name.";
  else if (name.length > LIMITS.name) errors.name = `Use ${LIMITS.name} characters or fewer.`;

  const categorySlug = text(fd, "category");
  if (!SLUG_PATTERN.test(categorySlug)) errors.category = "Choose a category.";

  const priceCents = parseCents(text(fd, "price"));
  if (priceCents === null) {
    errors.price = "Enter a price in dollars, like 1250 or 1250.00.";
  } else if (priceCents < MIN_PRICE_CENTS) {
    errors.price = "The price must be at least $0.50.";
  }

  const compareRaw = text(fd, "compareAt");
  let compareAtCents: number | null = null;
  if (compareRaw) {
    compareAtCents = parseCents(compareRaw);
    if (compareAtCents === null) {
      errors.compareAt = "Enter a price in dollars, or leave it blank.";
    } else if (priceCents !== null && compareAtCents <= priceCents) {
      errors.compareAt = "The original price must be higher than the price.";
    }
  }

  const stockDetail = text(fd, "stockDetail");
  if (stockDetail.length > LIMITS.stockDetail) {
    errors.stockDetail = `Use ${LIMITS.stockDetail} characters or fewer.`;
  }

  const description = text(fd, "description");
  if (!description) errors.description = "Enter a description.";
  else if (description.length > LIMITS.description) {
    errors.description = `Use ${LIMITS.description} characters or fewer.`;
  }

  const details = parseLines(text(fd, "details"));
  if (details.length > LIMITS.detailLines) {
    errors.details = `Keep it to ${LIMITS.detailLines} lines.`;
  } else if (details.some((d) => d.length > LIMITS.detailLine)) {
    errors.details = `Keep each line to ${LIMITS.detailLine} characters.`;
  }

  const care = text(fd, "care");
  if (!care) errors.care = "Enter care instructions.";
  else if (care.length > LIMITS.care) errors.care = `Use ${LIMITS.care} characters or fewer.`;

  const lowStockThreshold = wholeNumber(text(fd, "lowStockThreshold") || "3", LIMITS.threshold);
  if (lowStockThreshold === null) {
    errors.lowStockThreshold = `Enter a whole number from 0 to ${LIMITS.threshold}.`;
  }

  return {
    name,
    categorySlug,
    priceCents: priceCents ?? 0,
    compareAtCents,
    // A checkbox posts "on" when ticked and nothing at all otherwise.
    madeToOrder: fd.get("madeToOrder") === "on",
    stockDetail: stockDetail || null,
    description,
    details,
    care,
    lowStockThreshold: lowStockThreshold ?? 3,
  };
}

/** Edit: details, category, price and availability only. */
export function parseProductDetails(fd: FormData): ParseResult<ProductDetailsInput> {
  const errors: FieldErrors = {};
  const data = parseDetails(fd, errors);
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}

function parseDistinctList(
  raw: string,
  field: string,
  noun: string,
  max: number,
  errors: FieldErrors,
): string[] {
  const items = parseList(raw);
  if (items.length === 0) {
    errors[field] = `Enter at least one ${noun}.`;
  } else if (items.length > max) {
    errors[field] = `Keep it to ${max} ${noun}s.`;
  } else if (items.some((s) => s.length > LIMITS.listItem)) {
    errors[field] = `Keep each ${noun} to ${LIMITS.listItem} characters.`;
  } else if (items.some((s) => !skuPart(s))) {
    errors[field] = `Each ${noun} needs a letter or a number.`;
  } else if (new Set(items.map(skuPart)).size !== items.length) {
    // "Navy" and "navy " would make the same SKU.
    errors[field] = `Each ${noun} must be different.`;
  }
  return items;
}

export function parseNewProduct(fd: FormData): ParseResult<NewProductInput> {
  const errors: FieldErrors = {};
  const details = parseDetails(fd, errors);

  const slug = text(fd, "slug") || slugify(details.name);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens.";
  } else if (slug.length > SLUG_MAX) {
    errors.slug = `Use ${SLUG_MAX} characters or fewer.`;
  } else if (slug === "new") {
    // /admin/products/new is the create form, so this product could never be edited.
    errors.slug = "This slug is reserved. Choose another.";
  }

  const colours = parseDistinctList(text(fd, "colours"), "colours", "colour", LIMITS.colours, errors);
  const sizes = parseDistinctList(text(fd, "sizes"), "sizes", "size", LIMITS.sizes, errors);

  const initialStock = wholeNumber(text(fd, "initialStock") || "0", LIMITS.stock);
  if (initialStock === null) {
    errors.initialStock = `Enter a whole number from 0 to ${LIMITS.stock}.`;
  }

  // Colours in the order typed, sizes small to large within each: the same
  // display order as the seed.
  const variants = colours.flatMap((colour, c) =>
    sizes.map((size, s) => ({
      sku: variantSku(slug, colour, size),
      colour,
      size,
      position: c * sizes.length + s,
    })),
  );
  if (!errors.slug && !errors.colours && !errors.sizes) {
    if (variants.some((v) => v.sku.length > SKU_MAX)) {
      errors.slug = `The slug, colour and size together make SKUs over ${SKU_MAX} characters. Shorten one of them.`;
    } else if (new Set(variants.map((v) => v.sku)).size !== variants.length) {
      // "Navy" + "Blue S" and "Navy Blue" + "S" both make …-NAVY-BLUE-S.
      errors.colours = "Two colour and size pairs would make the same SKU. Rename one of them.";
    }
  }

  const imageUrl = text(fd, "imageUrl");
  if (!isCatalogueImageUrl(imageUrl)) {
    errors.imageUrl = `Use an https://${IMAGE_HOST}/… address.`;
  }
  const imageAlt = text(fd, "imageAlt");
  if (!imageAlt) errors.imageAlt = "Describe the photo for people who can't see it.";
  else if (imageAlt.length > LIMITS.alt) errors.imageAlt = `Use ${LIMITS.alt} characters or fewer.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      ...details,
      slug,
      variants,
      initialStock: initialStock ?? 0,
      packshot: { url: imageUrl, alt: imageAlt },
    },
  };
}

// --- Catalogue maintenance ----------------------------------------------------

export const MAX_STOCK = LIMITS.stock;

export type StockChange = { sku: string; expected: number; quantity: number };

/**
 * The stock grid: one `stock:<SKU>` field per variant with the new count and
 * a hidden `expected:<SKU>` with the count the form was rendered with. Only
 * changed rows come back; the write is a compare-and-set on `expected`, so a
 * sale that landed meanwhile is never overwritten.
 */
export function parseStockChanges(fd: FormData): ParseResult<StockChange[]> {
  const errors: FieldErrors = {};
  const changes: StockChange[] = [];
  for (const [key, value] of fd) {
    if (!key.startsWith("stock:") || typeof value !== "string") continue;
    const sku = key.slice("stock:".length);
    if (!sku || sku.length > SKU_MAX) continue;
    const expectedRaw = fd.get(`expected:${sku}`);
    const expected =
      typeof expectedRaw === "string" ? wholeNumber(expectedRaw, Number.MAX_SAFE_INTEGER) : null;
    if (expected === null) continue; // Not a row this form rendered.
    const quantity = wholeNumber(value, LIMITS.stock);
    if (quantity === null) {
      errors[key] = `Enter a whole number from 0 to ${LIMITS.stock}.`;
      continue;
    }
    if (quantity !== expected) changes.push({ sku, expected, quantity });
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: changes };
}

export const productStatusChoices = ["active", "draft", "archived"] as const;
export type ProductStatusChoice = (typeof productStatusChoices)[number];

export function parseProductStatus(raw: unknown): ProductStatusChoice | null {
  return (productStatusChoices as readonly unknown[]).includes(raw)
    ? (raw as ProductStatusChoice)
    : null;
}

export type NewImageInput = { url: string; alt: string; colour: string | null };

/**
 * A photo added by URL. `colours` are the product's own: a photo may only be
 * tagged with one of them (blank means it stands in for every colour).
 */
export function parseNewImage(
  fd: FormData,
  colours: readonly string[],
): ParseResult<NewImageInput> {
  const errors: FieldErrors = {};
  const url = text(fd, "imageUrl");
  if (!isCatalogueImageUrl(url)) errors.imageUrl = `Use an https://${IMAGE_HOST}/… address.`;
  const alt = text(fd, "imageAlt");
  if (!alt) errors.imageAlt = "Describe the photo for people who can't see it.";
  else if (alt.length > LIMITS.alt) errors.imageAlt = `Use ${LIMITS.alt} characters or fewer.`;
  const colourRaw = text(fd, "imageColour");
  const colour = colourRaw === "" ? null : colourRaw;
  if (colour !== null && !colours.includes(colour)) {
    errors.imageColour = "Choose one of this product's colours, or none.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { url, alt, colour } };
}

export type NewVariantsInput = {
  variants: { sku: string; colour: string; size: string }[];
  initialStock: number;
};

/**
 * Widens the colour × size grid. New colours get every size, new sizes get
 * every colour; pairs that already exist are skipped. SKUs follow the same
 * rule as creation, so they stay fixed once made.
 */
export function parseNewVariants(
  fd: FormData,
  productSlug: string,
  existing: readonly { colour: string; size: string; sku: string }[],
): ParseResult<NewVariantsInput> {
  const errors: FieldErrors = {};
  const addColours = parseList(text(fd, "addColours"));
  const addSizes = parseList(text(fd, "addSizes"));
  if (addColours.length === 0 && addSizes.length === 0) {
    errors.addColours = "Enter at least one new colour or size.";
  }
  for (const [field, items, noun] of [
    ["addColours", addColours, "colour"],
    ["addSizes", addSizes, "size"],
  ] as const) {
    if (items.some((s) => s.length > LIMITS.listItem)) {
      errors[field] = `Keep each ${noun} to ${LIMITS.listItem} characters.`;
    } else if (items.some((s) => !skuPart(s))) {
      errors[field] = `Each ${noun} needs a letter or a number.`;
    }
  }

  const colours = unique([...existing.map((v) => v.colour), ...addColours]);
  const sizes = unique([...existing.map((v) => v.size), ...addSizes]);
  if (colours.length > LIMITS.colours) errors.addColours = `Keep it to ${LIMITS.colours} colours.`;
  if (sizes.length > LIMITS.sizes) errors.addSizes = `Keep it to ${LIMITS.sizes} sizes.`;

  const initialStock = wholeNumber(text(fd, "addStock") || "0", LIMITS.stock);
  if (initialStock === null) errors.addStock = `Enter a whole number from 0 to ${LIMITS.stock}.`;

  const have = new Set(existing.map((v) => `${v.colour}\u0000${v.size}`));
  const takenSkus = new Set(existing.map((v) => v.sku));
  const variants = colours.flatMap((colour) =>
    sizes
      .filter((size) => !have.has(`${colour}\u0000${size}`))
      .map((size) => ({ sku: variantSku(productSlug, colour, size), colour, size })),
  );
  if (Object.keys(errors).length === 0) {
    if (variants.length === 0) {
      errors.addColours = "Those colours and sizes are already in the grid.";
    } else if (variants.some((v) => v.sku.length > SKU_MAX)) {
      errors.addColours = `These would make SKUs over ${SKU_MAX} characters. Use shorter names.`;
    } else if (
      variants.some((v) => takenSkus.has(v.sku)) ||
      new Set(variants.map((v) => v.sku)).size !== variants.length
    ) {
      errors.addColours = "Two colour and size pairs would make the same SKU. Rename one.";
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { variants, initialStock: initialStock ?? 0 } };
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
