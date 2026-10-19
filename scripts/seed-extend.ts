import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/db";
import {
  categories,
  productImages,
  products,
  productVariants,
} from "../src/db/schema";
import {
  accessoriesCover,
  extendedCategories,
  extendedCreatedAt,
  extendedProducts,
} from "./catalogue-extended";

/*
 * Adds the extended catalogue to an existing database without touching what
 * is already there. Unlike scripts/seed.ts it deletes nothing, so orders,
 * bags and back-office edits survive. Collections and pieces whose slug
 * already exists are skipped, so running it twice adds nothing the second
 * time. Products, photos and variants go in one db.batch() (one transaction).
 */

const skuPart = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Same base as scripts/seed.ts: collections are listed oldest first, and
// these follow the original five.
const BASE_DATE = Date.UTC(2026, 9, 1);

async function main() {
  await db
    .insert(categories)
    .values(
      extendedCategories.map((c, i) => ({
        ...c,
        createdAt: new Date(BASE_DATE + (5 + i) * 1000),
      })),
    )
    .onConflictDoNothing({ target: categories.slug });

  // Only fills a missing cover; one set in the back office is kept.
  await db
    .update(categories)
    .set(accessoriesCover)
    .where(and(eq(categories.slug, "accessories"), isNull(categories.imageUrl)));

  const categoryIds = new Map(
    (await db.select({ id: categories.id, slug: categories.slug }).from(categories)).map(
      (c) => [c.slug, c.id],
    ),
  );
  const existing = new Set(
    (await db.select({ slug: products.slug }).from(products)).map((p) => p.slug),
  );

  const toAdd = extendedProducts
    .map((row, i) => ({ row, createdAt: extendedCreatedAt(i) }))
    .filter(({ row }) => !existing.has(row.slug));

  if (toAdd.length === 0) {
    console.log("Extended catalogue already present: nothing to add.");
    return;
  }

  const seeded = toAdd.map(({ row: { categorySlug, images, sizes, colours, ...row }, createdAt }) => {
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) throw new Error(`Unknown category "${categorySlug}"`);
    const id = crypto.randomUUID();
    const variants = colours.flatMap((colour) =>
      sizes.map((size, s) => ({
        productId: id,
        sku: [row.slug, colour.name, size].map(skuPart).join("-"),
        colour: colour.name,
        size,
        stockQuantity: colour.stock[s],
      })),
    );
    return {
      product: { ...row, id, categoryId, createdAt },
      images: images.map((image, position) => ({ ...image, productId: id, position })),
      variants: variants.map((v, position) => ({ ...v, position })),
    };
  });

  const imageValues = seeded.flatMap((s) => s.images);
  const variantValues = seeded.flatMap((s) => s.variants);
  await db.batch([
    db.insert(products).values(seeded.map((s) => s.product)),
    db.insert(productImages).values(imageValues),
    db.insert(productVariants).values(variantValues),
  ]);

  console.log(
    `Added ${seeded.length} products, ${variantValues.length} variants, ${imageValues.length} images (${extendedProducts.length - seeded.length} already present).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
