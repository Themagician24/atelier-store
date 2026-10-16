import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  categories,
  productImages,
  products,
  productVariants,
} from "@/db/schema";
import { stockState, type StockState } from "@/lib/stock";

/*
 * Catalogue queries. Pages never touch `db`; they get the mapped `Product`.
 * Every read is cached under the "products" tag: with cacheComponents an
 * uncached fetch would break the static shell, and the tag lets a future
 * back-office call revalidateTag("products") after an edit.
 */

/** `colour` is null on the packshot, which stands in for every colour. */
export type ProductImage = { url: string; alt: string; colour: string | null };

export type Product = {
  slug: string;
  name: string;
  /** In display order; the card shows the first, or a count. */
  colours: string[];
  category: { slug: string; name: string };
  price: number;
  compareAt: number | null;
  /** Whole product: summed across variants. */
  stock: StockState;
  /** Editorial note shown next to the stock state on the product page. */
  stockDetail: string | null;
  description: string;
  details: string[];
  care: string;
  images: ProductImage[];
  variants: ProductVariant[];
};

export type ProductVariant = {
  sku: string;
  colour: string;
  size: string;
  stock: StockState;
};

export type Collection = {
  slug: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  pieceCount: number;
};

type ProductRow = typeof products.$inferSelect & {
  category: { slug: string; name: string };
  images: ProductImage[];
  variants: {
    sku: string;
    colour: string;
    size: string;
    stockQuantity: number;
  }[];
};

function mapProduct(row: ProductRow): Product {
  const { madeToOrder } = row;
  return {
    slug: row.slug,
    name: row.name,
    colours: [...new Set(row.variants.map((v) => v.colour))],
    category: row.category,
    price: row.priceCents / 100,
    compareAt: row.compareAtCents === null ? null : row.compareAtCents / 100,
    stock: stockState({
      stockQuantity: row.variants.reduce((n, v) => n + v.stockQuantity, 0),
      madeToOrder,
    }),
    stockDetail: row.stockDetail,
    description: row.description,
    details: row.details,
    care: row.care,
    images: row.images,
    variants: row.variants.map(({ stockQuantity, ...v }) => ({
      ...v,
      stock: stockState({ stockQuantity, madeToOrder }),
    })),
  };
}

/** Newest pieces first; `offset` skips the ones already shown above. */
export async function getNewestProducts({
  limit,
  offset = 0,
}: {
  limit: number;
  offset?: number;
}): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
    limit,
    offset,
    with: {
      category: { columns: { slug: true, name: true } },
      images: {
        columns: { url: true, alt: true, colour: true },
        orderBy: [asc(productImages.position)],
      },
      variants: {
        columns: { sku: true, colour: true, size: true, stockQuantity: true },
        orderBy: [asc(productVariants.position)],
      },
    },
  });
  return rows.map(mapProduct);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      category: { columns: { slug: true, name: true } },
      images: {
        columns: { url: true, alt: true, colour: true },
        orderBy: [asc(productImages.position)],
      },
      variants: {
        columns: { sku: true, colour: true, size: true, stockQuantity: true },
        orderBy: [asc(productVariants.position)],
      },
    },
  });
  return row ? mapProduct(row) : null;
}

/** Newest pieces from the same category, excluding the product itself. */
export async function getRelatedProducts(
  product: Product,
  limit: number,
): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    where: and(
      inArray(
        products.categoryId,
        db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, product.category.slug)),
      ),
      ne(products.slug, product.slug),
    ),
    orderBy: [desc(products.createdAt)],
    limit,
    with: {
      category: { columns: { slug: true, name: true } },
      images: {
        columns: { url: true, alt: true, colour: true },
        orderBy: [asc(productImages.position)],
      },
      variants: {
        columns: { sku: true, colour: true, size: true, stockQuantity: true },
        orderBy: [asc(productVariants.position)],
      },
    },
  });
  return rows.map(mapProduct);
}

/** Categories that have a cover image, with piece counts derived from products. */
export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      imageUrl: categories.imageUrl,
      imageAlt: categories.imageAlt,
      pieceCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(and(isNotNull(categories.imageUrl), isNotNull(categories.imageAlt)))
    .groupBy(categories.id)
    .orderBy(asc(categories.createdAt));

  return rows.flatMap(({ imageUrl, imageAlt, ...row }) =>
    imageUrl && imageAlt ? [{ ...row, imageUrl, imageAlt }] : [],
  );
}
