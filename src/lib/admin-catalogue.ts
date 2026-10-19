import "server-only";
import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  orderItems,
  productImages,
  products,
  productVariants,
  type ProductStatus,
} from "@/db/schema";
import { auditEntry } from "@/lib/admin-audit";
import type {
  CategoryOption,
  NewImageInput,
  NewProductInput,
  NewVariantsInput,
  ProductDetailsInput,
  StockChange,
} from "@/lib/admin-forms";
import { stockState, type StockState } from "@/lib/stock";

/*
 * The back office's reads and writes on the catalogue. src/lib/products.ts
 * stays the storefront's cached read side; everything here is request-time
 * and uncached, so an admin always sees the rows as they are now. Nothing
 * here checks the session: every caller is an admin page or Server Action
 * that has already called requireAdmin(), and passes the admin's id for the
 * audit log.
 */

export type AdminProductRow = {
  slug: string;
  name: string;
  status: ProductStatus;
  category: { slug: string; name: string };
  priceCents: number;
  compareAtCents: number | null;
  madeToOrder: boolean;
  lowStockThreshold: number;
  /** Whole product, summed across variants, in the storefront's four states. */
  stock: StockState;
  totalStock: number;
  variantCount: number;
  image: { url: string; alt: string } | null;
  createdAt: Date;
};

export type AdminVariant = {
  sku: string;
  colour: string;
  size: string;
  stockQuantity: number;
  /** In at least one order: kept for the history, never deleted. */
  ordered: boolean;
};

export type AdminImage = {
  url: string;
  alt: string;
  colour: string | null;
  position: number;
};

export type AdminProduct = AdminProductRow & {
  stockDetail: string | null;
  description: string;
  details: string[];
  care: string;
  updatedAt: Date;
  /** Some order references this product: archive it, never delete it. */
  hasOrders: boolean;
  variants: AdminVariant[];
  images: AdminImage[];
};

// --- Reads --------------------------------------------------------------------

export const ADMIN_PAGE_SIZE = 25;

export const adminSorts = {
  newest: "Newest",
  oldest: "Oldest",
  name: "Name",
  "price-asc": "Price, low to high",
  "price-desc": "Price, high to low",
  "stock-asc": "Stock, lowest first",
} as const;
export type AdminSort = keyof typeof adminSorts;

export const adminStockFilters = {
  out: "Out of stock",
  low: "Low stock",
  ok: "In stock",
} as const;
export type AdminStockFilter = keyof typeof adminStockFilters;

export type AdminProductQuery = {
  q: string;
  category: string | null;
  status: ProductStatus | null;
  stock: AdminStockFilter | null;
  sort: AdminSort;
  page: number;
};

// Qualified by hand: inside a correlated subquery a bare "id" would bind to
// the inner table.
const totalStock = sql<number>`coalesce((select sum(v.stock_quantity) from product_variants v where v.product_id = "products"."id"), 0)::int`;
const variantCount = sql<number>`(select count(*) from product_variants v where v.product_id = "products"."id")::int`;
const firstImageUrl = sql<string | null>`(select i.url from product_images i where i.product_id = "products"."id" order by i.position limit 1)`;
const firstImageAlt = sql<string | null>`(select i.alt from product_images i where i.product_id = "products"."id" order by i.position limit 1)`;

/** `%` and `_` typed into the search box are literal, not wildcards. */
function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function productWhere(query: AdminProductQuery): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];
  if (query.q) {
    const term = likeTerm(query.q);
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.slug, term),
        exists(
          db
            .select({ one: sql`1` })
            .from(productVariants)
            .where(and(eq(productVariants.productId, products.id), ilike(productVariants.sku, term))),
        ),
      ),
    );
  }
  if (query.category) conditions.push(eq(categories.slug, query.category));
  if (query.status) conditions.push(eq(products.status, query.status));
  if (query.stock === "out") {
    conditions.push(sql`not ${products.madeToOrder} and ${totalStock} = 0`);
  } else if (query.stock === "low") {
    conditions.push(sql`${totalStock} > 0 and ${totalStock} <= ${products.lowStockThreshold}`);
  } else if (query.stock === "ok") {
    conditions.push(sql`(${totalStock} > ${products.lowStockThreshold} or (${products.madeToOrder} and ${totalStock} = 0))`);
  }
  return and(...conditions);
}

const orderBy: Record<AdminSort, SQL[]> = {
  newest: [desc(products.createdAt)],
  oldest: [asc(products.createdAt)],
  name: [asc(products.name)],
  "price-asc": [asc(products.priceCents), desc(products.createdAt)],
  "price-desc": [desc(products.priceCents), desc(products.createdAt)],
  "stock-asc": [asc(totalStock), asc(products.name)],
};

/** One page of the catalogue, filtered and sorted in SQL. */
export async function listAdminProducts(
  query: AdminProductQuery,
): Promise<{ rows: AdminProductRow[]; total: number }> {
  const where = productWhere(query);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        slug: products.slug,
        name: products.name,
        status: products.status,
        categorySlug: categories.slug,
        categoryName: categories.name,
        priceCents: products.priceCents,
        compareAtCents: products.compareAtCents,
        madeToOrder: products.madeToOrder,
        lowStockThreshold: products.lowStockThreshold,
        createdAt: products.createdAt,
        totalStock,
        variantCount,
        imageUrl: firstImageUrl,
        imageAlt: firstImageAlt,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(...orderBy[query.sort])
      .limit(ADMIN_PAGE_SIZE)
      .offset((query.page - 1) * ADMIN_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where),
  ]);

  return {
    total,
    rows: rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      status: r.status,
      category: { slug: r.categorySlug, name: r.categoryName },
      priceCents: r.priceCents,
      compareAtCents: r.compareAtCents,
      madeToOrder: r.madeToOrder,
      lowStockThreshold: r.lowStockThreshold,
      stock: stockState({
        stockQuantity: r.totalStock,
        madeToOrder: r.madeToOrder,
        lowStockThreshold: r.lowStockThreshold,
      }),
      totalStock: r.totalStock,
      variantCount: r.variantCount,
      image: r.imageUrl ? { url: r.imageUrl, alt: r.imageAlt ?? "" } : null,
      createdAt: r.createdAt,
    })),
  };
}

export async function getAdminProduct(slug: string): Promise<AdminProduct | null> {
  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      category: { columns: { slug: true, name: true } },
      images: {
        columns: { url: true, alt: true, colour: true, position: true },
        orderBy: [asc(productImages.position)],
      },
      variants: {
        columns: { id: true, sku: true, colour: true, size: true, stockQuantity: true },
        orderBy: [asc(productVariants.position)],
      },
    },
  });
  if (!row) return null;

  // Which variants (and so the product) appear in an order. The slug
  // snapshot also catches variants deleted before this rule existed.
  const ordered = await db
    .selectDistinct({ variantId: orderItems.variantId })
    .from(orderItems)
    .where(eq(orderItems.productSlug, slug));
  const orderedIds = new Set(ordered.map((o) => o.variantId));

  const total = row.variants.reduce((n, v) => n + v.stockQuantity, 0);
  return {
    slug: row.slug,
    name: row.name,
    status: row.status,
    category: row.category,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    madeToOrder: row.madeToOrder,
    lowStockThreshold: row.lowStockThreshold,
    stock: stockState({
      stockQuantity: total,
      madeToOrder: row.madeToOrder,
      lowStockThreshold: row.lowStockThreshold,
    }),
    totalStock: total,
    variantCount: row.variants.length,
    image: row.images[0] ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stockDetail: row.stockDetail,
    description: row.description,
    details: row.details,
    care: row.care,
    hasOrders: ordered.length > 0,
    variants: row.variants.map(({ id, ...v }) => ({ ...v, ordered: orderedIds.has(id) })),
    images: row.images,
  };
}

/** For the category picker, in catalogue order. */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.createdAt));
}

// --- Writes -----------------------------------------------------------------

/** Why a write was refused, keyed to the form field that should say so. */
export type WriteResult =
  | { ok: true; slug: string }
  | { ok: false; field: string | null; message: string };

const GONE: WriteResult = { ok: false, field: null, message: "This product no longer exists." };

async function categoryId(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

async function productId(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

const UNKNOWN_CATEGORY: WriteResult = {
  ok: false,
  field: "category",
  message: "That category no longer exists. Choose another.",
};

/** The Postgres unique constraint behind a failed insert, if that's what it was. */
function uniqueViolation(error: unknown): string | null {
  // Drizzle wraps the driver's error in `cause`.
  for (let e = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    const { code, constraint } = e as { code?: unknown; constraint?: unknown };
    if (code === "23505") return typeof constraint === "string" ? constraint : "";
  }
  return null;
}

function detailColumns(input: ProductDetailsInput, catId: string) {
  return {
    name: input.name,
    categoryId: catId,
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents,
    madeToOrder: input.madeToOrder,
    stockDetail: input.stockDetail,
    description: input.description,
    details: input.details,
    care: input.care,
    lowStockThreshold: input.lowStockThreshold,
  };
}

/**
 * The product, its full colour × size grid and its packshot in one batch:
 * the storefront never sees a product without variants or a photo
 * (getNavigation reads images[0]).
 */
export async function createProduct(
  actorId: string,
  input: NewProductInput,
): Promise<WriteResult> {
  const catId = await categoryId(input.categorySlug);
  if (!catId) return UNKNOWN_CATEGORY;

  const id = randomUUID();
  try {
    await db.batch([
      db.insert(products).values({ id, slug: input.slug, ...detailColumns(input, catId) }),
      db.insert(productVariants).values(
        input.variants.map((v) => ({
          productId: id,
          sku: v.sku,
          colour: v.colour,
          size: v.size,
          position: v.position,
          stockQuantity: input.initialStock,
        })),
      ),
      db.insert(productImages).values({
        productId: id,
        url: input.packshot.url,
        alt: input.packshot.alt,
        colour: null,
        position: 0,
      }),
      auditEntry(actorId, "product.create", "product", input.slug, {
        priceCents: input.priceCents,
        variants: input.variants.length,
        initialStock: input.initialStock,
      }),
    ]);
  } catch (error) {
    const constraint = uniqueViolation(error);
    if (constraint === "products_slug_unique") {
      return { ok: false, field: "slug", message: "Another product already uses this slug." };
    }
    if (constraint === "product_variants_sku_unique") {
      return {
        ok: false,
        field: "slug",
        message: "These SKUs are already taken by another product. Choose a different slug.",
      };
    }
    throw error;
  }
  return { ok: true, slug: input.slug };
}

/** Details, category, price and availability. Slug, SKUs and photos stay put. */
export async function updateProduct(
  actorId: string,
  slug: string,
  input: ProductDetailsInput,
): Promise<WriteResult> {
  const catId = await categoryId(input.categorySlug);
  if (!catId) return UNKNOWN_CATEGORY;

  const updated = await db
    .update(products)
    .set(detailColumns(input, catId))
    .where(eq(products.slug, slug))
    .returning({ slug: products.slug });
  if (updated.length === 0) return GONE;
  // Recorded once the change is known to have happened.
  await auditEntry(actorId, "product.update", "product", slug, {
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents,
    madeToOrder: input.madeToOrder,
    lowStockThreshold: input.lowStockThreshold,
  });
  return { ok: true, slug };
}

export type StockResult = {
  applied: StockChange[];
  /** Changed by someone else (or a sale) since the form was loaded. */
  conflicts: string[];
};

/**
 * Sets stock per SKU, each only if it still holds the count the admin saw
 * (`expected`). A webhook decrement that landed in between makes that row a
 * conflict instead of being silently overwritten. The CHECK on
 * stock_quantity >= 0 is the last guard against a negative count.
 */
export async function updateStock(
  actorId: string,
  slug: string,
  changes: StockChange[],
): Promise<StockResult | null> {
  const id = await productId(slug);
  if (!id) return null;
  if (changes.length === 0) return { applied: [], conflicts: [] };

  const [first, ...rest] = changes.map((c) =>
    db
      .update(productVariants)
      .set({ stockQuantity: c.quantity })
      .where(
        and(
          eq(productVariants.productId, id),
          eq(productVariants.sku, c.sku),
          eq(productVariants.stockQuantity, c.expected),
        ),
      )
      .returning({ sku: productVariants.sku }),
  );
  const results = await db.batch([first, ...rest]);
  const done = new Set(results.flat().map((r) => r.sku));
  const applied = changes.filter((c) => done.has(c.sku));
  const conflicts = changes.filter((c) => !done.has(c.sku)).map((c) => c.sku);

  if (applied.length > 0) {
    await auditEntry(actorId, "product.stock", "product", slug, {
      changes: applied.map((c) => ({ sku: c.sku, from: c.expected, to: c.quantity })),
    });
  }
  return { applied, conflicts };
}

export async function setProductStatus(
  actorId: string,
  slug: string,
  status: ProductStatus,
): Promise<WriteResult> {
  const updated = await db
    .update(products)
    .set({ status })
    .where(eq(products.slug, slug))
    .returning({ slug: products.slug });
  if (updated.length === 0) return GONE;
  await auditEntry(actorId, "product.status", "product", slug, { status });
  return { ok: true, slug };
}

/** Appends new colour × size pairs after the existing grid. */
export async function addVariants(
  actorId: string,
  slug: string,
  input: NewVariantsInput,
): Promise<WriteResult> {
  const id = await productId(slug);
  if (!id) return GONE;
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${productVariants.position}), -1)::int + 1` })
    .from(productVariants)
    .where(eq(productVariants.productId, id));
  try {
    await db.batch([
      db.insert(productVariants).values(
        input.variants.map((v, i) => ({
          productId: id,
          sku: v.sku,
          colour: v.colour,
          size: v.size,
          position: next + i,
          stockQuantity: input.initialStock,
        })),
      ),
      auditEntry(actorId, "product.variants.add", "product", slug, {
        skus: input.variants.map((v) => v.sku),
        initialStock: input.initialStock,
      }),
    ]);
  } catch (error) {
    if (uniqueViolation(error) !== null) {
      return { ok: false, field: "addColours", message: "One of these SKUs already exists." };
    }
    throw error;
  }
  return { ok: true, slug };
}

/**
 * Removes a variant nobody has ordered (any bag lines go with it). An
 * ordered variant stays for the history: set its stock to 0 instead.
 */
export async function removeVariant(
  actorId: string,
  slug: string,
  sku: string,
): Promise<WriteResult> {
  const id = await productId(slug);
  if (!id) return GONE;
  const neverOrdered = sql`not exists (
    select 1 from order_items oi where oi.variant_id = ${productVariants.id} or oi.sku = ${productVariants.sku}
  )`;
  const deleted = await db
    .delete(productVariants)
    .where(and(eq(productVariants.productId, id), eq(productVariants.sku, sku), neverOrdered))
    .returning({ sku: productVariants.sku });
  if (deleted.length === 0) {
    return {
      ok: false,
      field: null,
      message: "This SKU has been ordered, so it stays for the order history. Set its stock to 0 instead.",
    };
  }
  await auditEntry(actorId, "product.variants.remove", "product", slug, { sku });
  return { ok: true, slug };
}

export async function addImage(
  actorId: string,
  slug: string,
  image: NewImageInput,
): Promise<WriteResult> {
  const id = await productId(slug);
  if (!id) return GONE;
  try {
    await db.batch([
      db.execute(sql`
        insert into product_images (product_id, url, alt, colour, position)
        select ${id}::uuid, ${image.url}, ${image.alt}, ${image.colour},
          coalesce(max(position), -1) + 1
        from product_images where product_id = ${id}::uuid`),
      auditEntry(actorId, "product.image.add", "product", slug, { url: image.url, colour: image.colour }),
    ]);
  } catch (error) {
    if (uniqueViolation(error) !== null) {
      return { ok: false, field: null, message: "Another change landed at the same time. Try again." };
    }
    throw error;
  }
  return { ok: true, slug };
}

/** Any photo but the last one: a product on sale always has a picture. */
export async function removeImage(
  actorId: string,
  slug: string,
  position: number,
): Promise<WriteResult> {
  const id = await productId(slug);
  if (!id) return GONE;
  const result = await db.execute(sql`
    delete from product_images
    where product_id = ${id}::uuid and position = ${position}
      and (select count(*) from product_images where product_id = ${id}::uuid) > 1
    returning url`);
  if (result.rows.length === 0) {
    return { ok: false, field: null, message: "A product keeps at least one photo." };
  }
  await auditEntry(actorId, "product.image.remove", "product", slug, { position });
  return { ok: true, slug };
}

/**
 * Swaps a photo with its neighbour. Postgres checks the UNIQUE (product,
 * position) row by row, so the swap goes through a free position, all in one
 * batch.
 */
export async function moveImage(
  actorId: string,
  slug: string,
  position: number,
  direction: "up" | "down",
): Promise<WriteResult> {
  const id = await productId(slug);
  if (!id) return GONE;
  const neighbours = await db
    .select({ position: productImages.position })
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.position));
  const index = neighbours.findIndex((n) => n.position === position);
  const other = neighbours[direction === "up" ? index - 1 : index + 1];
  if (index === -1 || !other) return { ok: true, slug };

  const parked = -1 - position;
  const at = (p: number) =>
    and(eq(productImages.productId, id), eq(productImages.position, p));
  await db.batch([
    db.update(productImages).set({ position: parked }).where(at(position)),
    db.update(productImages).set({ position }).where(at(other.position)),
    db.update(productImages).set({ position: other.position }).where(at(parked)),
    auditEntry(actorId, "product.image.move", "product", slug, { from: position, to: other.position }),
  ]);
  return { ok: true, slug };
}

/**
 * Deletes a product that has never been ordered, with its variants, photos,
 * bag lines and analytics. Anything ordered is refused: archive it instead.
 */
export async function deleteProduct(actorId: string, slug: string): Promise<WriteResult> {
  // The guard sits in the DELETE itself, so an order placed a moment ago
  // still wins.
  const deleted = await db
    .delete(products)
    .where(
      and(
        eq(products.slug, slug),
        sql`not exists (select 1 from order_items oi where oi.product_slug = ${slug})`,
      ),
    )
    .returning({ slug: products.slug });
  if (deleted.length === 0) {
    if (!(await productId(slug))) return GONE;
    return {
      ok: false,
      field: null,
      message: "This product has been ordered, so it can't be deleted. Archive it instead.",
    };
  }
  await auditEntry(actorId, "product.delete", "product", slug);
  return { ok: true, slug };
}
