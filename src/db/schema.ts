// Single schema file: Better Auth tables and every application table go here.
// Column names are derived from the keys (`casing: "snake_case"`).
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// --- Better Auth (core schema: don't rename or drop these columns) ---------

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Declared to Better Auth with `input: false`, so no auth endpoint can set
    // it; scripts/set-role.ts is the only way to grant admin.
    role: text().notNull().default("customer"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("user_role_check", sql`${t.role} in ('customer', 'admin')`),
    index("user_created_at_idx").on(t.createdAt),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  cartItems: many(cartItems),
  orders: many(orders),
}));

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    // Hash for email/password sign-in; null for OAuth accounts.
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// Rate-limit counters for /api/auth/*. In the database rather than memory,
// which resets per serverless instance.
export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  // Epoch milliseconds.
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// --- Catalogue --------------------------------------------------------------

export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  // Without a cover image the category stays out of the homepage strip.
  imageUrl: text(),
  imageAlt: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productStatuses = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    priceCents: integer().notNull(),
    compareAtCents: integer(),
    // Stock is held per variant; the UI state is derived by stockState().
    madeToOrder: boolean().notNull().default(false),
    stockDetail: text(),
    // Only `active` products reach the storefront, the sitemap and the bag.
    // Archiving is the way out for anything that has been ordered: deleting
    // it would orphan the order history.
    status: text().$type<ProductStatus>().notNull().default("active"),
    // Total stock at or below this reads as "low" in the storefront and admin.
    lowStockThreshold: integer().notNull().default(3),
    description: text().notNull(),
    details: text().array().notNull().default(sql`'{}'::text[]`),
    care: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    index("products_created_at_idx").on(t.createdAt),
    index("products_status_idx").on(t.status),
    check("products_price_cents_check", sql`${t.priceCents} >= 0`),
    check(
      "products_status_check",
      sql`${t.status} in ('active', 'draft', 'archived')`,
    ),
    check(
      "products_low_stock_threshold_check",
      sql`${t.lowStockThreshold} >= 0`,
    ),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  events: many(productEvents),
}));

export const productImages = pgTable(
  "product_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text().notNull(),
    // Belongs to the row: the same URL can be reused with different copy.
    alt: text().notNull(),
    // The variant colour this photo shows; null for the packshot, which
    // stands in for any colour without a photo of its own.
    colour: text(),
    // 0 is the packshot.
    position: integer().notNull(),
  },
  (t) => [unique("product_images_product_position_key").on(t.productId, t.position)],
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

/** One sellable colour × size combination, with its own stock. */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text().notNull().unique(),
    colour: text().notNull(),
    // "One size" for bags and accessories.
    size: text().notNull(),
    stockQuantity: integer().notNull().default(0),
    // Display order: colours as listed, sizes small to large.
    position: integer().notNull(),
  },
  (t) => [
    unique("product_variants_product_colour_size_key").on(
      t.productId,
      t.colour,
      t.size,
    ),
    check(
      "product_variants_stock_quantity_check",
      sql`${t.stockQuantity} >= 0`,
    ),
  ],
);

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    cartItems: many(cartItems),
    orderItems: many(orderItems),
  }),
);

// --- Bag --------------------------------------------------------------------

/**
 * One row per variant in a signed-in user's bag; the user is the bag, so
 * there is no carts table. No price is stored: it is read live from
 * products.price_cents, and the quantity is re-capped against stock on read.
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // The upsert target: adding a variant twice raises its quantity.
    unique("cart_items_user_variant_key").on(t.userId, t.variantId),
    check("cart_items_quantity_check", sql`${t.quantity} >= 1`),
  ],
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(user, { fields: [cartItems.userId], references: [user.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

// --- Orders -----------------------------------------------------------------

export const orderStatuses = [
  "pending",
  "processing",
  "paid",
  "payment_failed",
  "expired",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

/** Preparation and delivery, moved by an admin once an order is paid. */
export const fulfilmentStatuses = [
  "unfulfilled",
  "preparing",
  "shipped",
  "delivered",
] as const;
export type FulfilmentStatus = (typeof fulfilmentStatuses)[number];

export type ShippingAddress = {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

/**
 * Created `pending` when checkout starts, with its lines snapshotted in
 * order_items; only the Stripe webhook moves it on. The browser never sets a
 * status or an amount.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Public identifier for URLs and receipts, e.g. AT-7F3K9Q.
    reference: text().notNull().unique(),
    // Nullable so an order outlives the account it was placed from.
    userId: text().references(() => user.id, { onDelete: "set null" }),
    email: text().notNull(),
    status: text().$type<OrderStatus>().notNull().default("pending"),
    currency: text().notNull().default("usd"),
    // Our own sum at checkout start; Stripe's amount_subtotal must match it.
    subtotalCents: integer().notNull(),
    shippingCents: integer().notNull().default(0),
    // Stripe's amount_total, set when the payment is confirmed.
    totalCents: integer(),
    // UNIQUE: one order per Checkout Session, whatever the webhook replays.
    stripeCheckoutSessionId: text().unique(),
    stripePaymentIntentId: text(),
    shippingAddress: jsonb().$type<ShippingAddress>(),
    // Flags for the admin: Stripe charged a different subtotal, or stock had
    // already run out when the payment landed (the accepted oversell window).
    amountMismatch: boolean().notNull().default(false),
    oversold: boolean().notNull().default(false),
    // Stripe's charge.amount_refunded; the order turns `refunded` only when
    // the whole amount is back.
    refundedCents: integer().notNull().default(0),
    refundedAt: timestamp({ withTimezone: true }),
    fulfilmentStatus: text()
      .$type<FulfilmentStatus>()
      .notNull()
      .default("unfulfilled"),
    shippedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_paid_at_idx").on(t.paidAt),
    check(
      "orders_status_check",
      sql`${t.status} in ('pending', 'processing', 'paid', 'payment_failed', 'expired', 'cancelled', 'refunded')`,
    ),
    check(
      "orders_fulfilment_status_check",
      sql`${t.fulfilmentStatus} in ('unfulfilled', 'preparing', 'shipped', 'delivered')`,
    ),
    check("orders_subtotal_cents_check", sql`${t.subtotalCents} >= 0`),
    check("orders_refunded_cents_check", sql`${t.refundedCents} >= 0`),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  statusEvents: many(orderStatusEvents),
}));

/** What was bought, as it was at checkout: never re-read from the catalogue. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Null once the variant is deleted; the snapshot still describes it.
    variantId: uuid().references(() => productVariants.id, {
      onDelete: "set null",
    }),
    sku: text().notNull(),
    productSlug: text().notNull(),
    productName: text().notNull(),
    colour: text().notNull(),
    size: text().notNull(),
    imageUrl: text(),
    madeToOrder: boolean().notNull(),
    unitPriceCents: integer().notNull(),
    quantity: integer().notNull(),
    lineTotalCents: integer().notNull(),
  },
  (t) => [
    // One line per variant, as in the bag it was copied from.
    unique("order_items_order_variant_key").on(t.orderId, t.variantId),
    check("order_items_quantity_check", sql`${t.quantity} >= 1`),
  ],
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

/** Every Stripe event already applied, keyed by its evt_ id. */
export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(),
  type: text().notNull(),
  stripeCreatedAt: timestamp({ withTimezone: true }).notNull(),
  receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every status change of an order, payment or fulfilment, in the order it
 * happened. Written in the same SQL statement as the change itself.
 */
export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: text().$type<"payment" | "fulfilment">().notNull(),
    fromStatus: text().notNull(),
    toStatus: text().notNull(),
    source: text().$type<"stripe" | "admin">().notNull(),
    stripeEventId: text(),
    actorUserId: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_status_events_order_id_idx").on(t.orderId, t.createdAt),
    check(
      "order_status_events_kind_check",
      sql`${t.kind} in ('payment', 'fulfilment')`,
    ),
    check(
      "order_status_events_source_check",
      sql`${t.source} in ('stripe', 'admin')`,
    ),
  ],
);

export const orderStatusEventsRelations = relations(
  orderStatusEvents,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusEvents.orderId],
      references: [orders.id],
    }),
    actor: one(user, {
      fields: [orderStatusEvents.actorUserId],
      references: [user.id],
    }),
  }),
);

// --- Admin and analytics ----------------------------------------------------

/** Who changed what in the back office. Never holds secrets or card data. */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorUserId: text().references(() => user.id, { onDelete: "set null" }),
    action: text().notNull(),
    targetType: text().notNull(),
    targetId: text().notNull(),
    details: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_log_created_at_idx").on(t.createdAt)],
);

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  actor: one(user, {
    fields: [adminAuditLog.actorUserId],
    references: [user.id],
  }),
}));

export const productEventTypes = ["view", "click", "add_to_bag"] as const;
export type ProductEventType = (typeof productEventTypes)[number];

/**
 * First-party product interest, one row per visitor, product, type and UTC
 * day: a reload the same day hits the UNIQUE and is dropped. `visitorHash`
 * is a daily-rotating HMAC; no IP, cookie or user id is stored.
 */
export const productEvents = pgTable(
  "product_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: text().$type<ProductEventType>().notNull(),
    visitorHash: text().notNull(),
    day: date({ mode: "string" }).notNull(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("product_events_dedupe_key").on(
      t.productId,
      t.type,
      t.visitorHash,
      t.day,
    ),
    index("product_events_type_day_idx").on(t.type, t.day),
    check(
      "product_events_type_check",
      sql`${t.type} in ('view', 'click', 'add_to_bag')`,
    ),
  ],
);

export const productEventsRelations = relations(productEvents, ({ one }) => ({
  product: one(products, {
    fields: [productEvents.productId],
    references: [products.id],
  }),
}));
