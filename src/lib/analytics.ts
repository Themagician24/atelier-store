import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  productEvents,
  products,
  productVariants,
  type ProductEventType,
} from "@/db/schema";
import { dayBucket, visitorHash } from "@/lib/analytics-events";

// Writes for product analytics. Reads live in src/lib/admin-insights.ts.

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("BETTER_AUTH_SECRET is not set");
  return value;
}

/**
 * One row per visitor, product, type and day; repeats are dropped by the
 * UNIQUE. Only active products are counted. The product is resolved and the
 * row inserted in one statement.
 */
export async function recordProductEvent(input: {
  slug: string;
  type: ProductEventType;
  identity: readonly string[];
  at?: Date;
}): Promise<void> {
  const day = dayBucket(input.at ?? new Date());
  const hash = visitorHash(secret(), day, input.identity);
  await db.execute(sql`
    insert into ${productEvents} (product_id, type, visitor_hash, day)
    select ${products.id}, ${input.type}, ${hash}, ${day}::date
    from ${products}
    where ${products.slug} = ${input.slug} and ${products.status} = 'active'
    on conflict on constraint product_events_dedupe_key do nothing
  `);
}

/** Server-side, from the add-to-bag action: the user is known and real. */
export async function recordAddToBag(userId: string, sku: string): Promise<void> {
  const [row] = await db
    .select({ slug: products.slug })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(productVariants.sku, sku), eq(products.status, "active")))
    .limit(1);
  if (!row) return;
  await recordProductEvent({
    slug: row.slug,
    type: "add_to_bag",
    identity: [`user:${userId}`],
  });
}

/** Beacons one network may send per minute before the rest are dropped. */
export const EVENTS_PER_MINUTE = 60;
const WINDOW_MS = 60_000;

/**
 * A fixed one-minute window per client IP, in the same `rate_limit` table
 * Better Auth uses (keys are prefixed so they never collide). The key is a
 * hash: the IP itself is never stored. One statement, so concurrent beacons
 * count correctly.
 */
export async function allowEvent(ip: string, now = Date.now()): Promise<boolean> {
  if (!ip) return false;
  const key = `product-events:${visitorHash(secret(), "rate", [ip])}`;
  const result = await db.execute(sql`
    insert into rate_limit (id, key, count, last_request)
    values (gen_random_uuid()::text, ${key}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limit.last_request < ${now - WINDOW_MS} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request < ${now - WINDOW_MS} then ${now} else rate_limit.last_request end
    returning count`);
  return Number((result.rows[0] as { count: number }).count) <= EVENTS_PER_MINUTE;
}
