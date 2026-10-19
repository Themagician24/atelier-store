import "dotenv/config";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
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
import { colourwayImage, colourways } from "./colourways";

/*
 * Adds the extended catalogue to an existing database without touching what
 * is already there. Unlike scripts/seed.ts it deletes nothing, so orders,
 * bags and back-office edits survive. Collections and pieces whose slug
 * already exists are skipped, so running it twice adds nothing the second
 * time. Products, photos and variants go in one db.batch() (one transaction).
 *
 * Pieces already there get the colourways (scripts/colourways.ts) they lack:
 * a variant per size, stocked like their first colour, and the photo, both
 * appended after what the back office may have arranged.
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

  const seeded = toAdd.map(({ row: { categorySlug, images: ownImages, sizes, colours: ownColours, ...row }, createdAt }) => {
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) throw new Error(`Unknown category "${categorySlug}"`);
    const id = crypto.randomUUID();
    const extra = colourways[row.slug] ?? [];
    const colours = [
      ...ownColours,
      ...extra.map(({ name }) => ({ name, stock: ownColours[0].stock })),
    ];
    const images = [
      ...ownImages,
      ...extra.map((c) => colourwayImage(row.name, ownImages[0].url, c)),
    ];
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

  const missing = await missingColourways();

  const imageValues = [...seeded.flatMap((s) => s.images), ...missing.images];
  const variantValues = [...seeded.flatMap((s) => s.variants), ...missing.variants];
  // Parents first: photos and variants reference their product.
  const [first, ...rest]: BatchItem<"pg">[] = [
    ...(seeded.length ? [db.insert(products).values(seeded.map((s) => s.product))] : []),
    ...(imageValues.length ? [db.insert(productImages).values(imageValues)] : []),
    ...(variantValues.length
      ? [
          db
            .insert(productVariants)
            .values(variantValues)
            .onConflictDoNothing({ target: productVariants.sku }),
        ]
      : []),
  ];
  if (!first) {
    console.log("Extended catalogue and colourways already present: nothing to add.");
    return;
  }
  await db.batch([first, ...rest]);

  console.log(
    `Added ${seeded.length} products (${extendedProducts.length - seeded.length} already present) and ${missing.colours} colourways to existing ones: ${variantValues.length} variants, ${imageValues.length} images.`,
  );
}

/** Colourway variants and photos for pieces already in the database. */
async function missingColourways() {
  const rows = await db.query.products.findMany({
    where: inArray(products.slug, Object.keys(colourways)),
    columns: { id: true, slug: true, name: true },
    with: {
      images: { columns: { url: true, colour: true, position: true } },
      variants: { columns: { colour: true, size: true, stockQuantity: true, position: true } },
    },
  });

  const images: (typeof productImages.$inferInsert)[] = [];
  const variants: (typeof productVariants.$inferInsert)[] = [];
  let colours = 0;
  for (const product of rows) {
    const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
    const ownImages = product.images.toSorted(byPosition);
    const ownVariants = product.variants.toSorted(byPosition);
    const packshot = ownImages.find((i) => i.colour === null) ?? ownImages[0];
    if (!packshot || ownVariants.length === 0) continue;
    // Sizes and stock come from the first colour, as in scripts/seed.ts.
    const base = ownVariants.filter((v) => v.colour === ownVariants[0].colour);
    let imagePosition = Math.max(...ownImages.map((i) => i.position)) + 1;
    let variantPosition = Math.max(...ownVariants.map((v) => v.position)) + 1;

    for (const colourway of colourways[product.slug]) {
      if (ownVariants.some((v) => v.colour === colourway.name)) continue;
      colours++;
      for (const { size, stockQuantity } of base) {
        variants.push({
          productId: product.id,
          sku: [product.slug, colourway.name, size].map(skuPart).join("-"),
          colour: colourway.name,
          size,
          stockQuantity,
          position: variantPosition++,
        });
      }
      const image = colourwayImage(product.name, packshot.url, colourway);
      if (!ownImages.some((i) => i.url === image.url)) {
        images.push({ ...image, productId: product.id, position: imagePosition++ });
      }
    }
  }
  return { images, variants, colours };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
