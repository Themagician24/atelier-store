# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Scripts are in `package.json`. What they don't say:

- `npm run build` is the only full typecheck (`tsc` has `noEmit`). Route types (`PageProps<"/route">`, `LayoutProps<…>`) are generated into `.next/types`, so they only exist after a dev server or build has run.
- `npm test` runs `src/**/*.test.ts` under Node's runner via `tsx` — pure modules only, nothing that imports `db` or `server-only`.
- `npm run dev` rewrites the agent-rules block in `AGENTS.md`.
- `db:push` is a dev-only escape hatch; schema changes ship as `db:generate` → read the SQL → `db:migrate`.
- `npm run auth:role -- <email> <customer|admin>` is the only way to grant or revoke admin.

## Architecture

Next.js 16 App Router + React 19 with `cacheComponents: true`, Tailwind v4 (no `tailwind.config`; the theme lives in `src/app/globals.css`), TypeScript strict.

**Data layer.** One `db` over Neon's HTTP driver (`drizzle-orm/neon-http`), which is stateless: no interactive transactions, so batch with `db.batch()` or write a single SQL statement — never `db.transaction()`. `DATABASE_URL` must be the **pooled** Neon string. Only the `src/lib/*` owner modules import `db`: `products.ts` (storefront reads), `admin-catalogue.ts` (back-office catalogue), `admin-orders.ts`, `admin-customers.ts`, `admin-stats.ts`, `admin-insights.ts`, `admin-audit.ts`, `analytics.ts` (event writes), `cart.ts`, `orders.ts`, `auth.ts`. Pages and actions call those. A Drizzle condition passed to a relational query (`db.query…`) gets its columns rewritten: build it per call (`onSale()` in `products.ts`), never share one SQL object across queries.

**Schema.** `src/db/schema.ts` is the single schema file for every table, Better Auth's included — renaming or dropping Better Auth columns breaks auth. Conventions: camelCase TS keys over snake_case columns; `uuid` primary keys with `defaultRandom()` on application tables; `slug` is the public identifier every route, React key and form uses (never an id); declare each foreign key's `relations()` beside its table. Write Drizzle relational `with` blocks inline at each call site — hoisting them into a shared `as const` breaks result-shape inference.

**Catalogue decisions.**

- **Money is integer cents** in the DB. Storefront components get dollars from `mapProduct()` and format with `currency` (whole dollars, **catalogue only**). Anything derived from cents — bag, checkout, receipts, admin — uses `formatCents`, or `$99.99` renders as `$100` beside a Stripe page that says otherwise.
- **Stock is a quantity plus a flag**, never a stored state: `product_variants.stockQuantity` per colour × size and `products.madeToOrder`. The four UI states come only from `stockState()` in `src/lib/stock.ts`, with the product's own `lowStockThreshold`; `stockDetail` is editorial free text beside them.
- **`products.status`** is `active` | `draft` | `archived`. Every storefront read filters `active` (store, nav, search, sitemap, related); `getBag()` shows a non-active product as `unavailable`, which blocks checkout. A product that appears in any `order_items` (by `product_slug`) is archived, never deleted; a variant in an order is never deleted either.
- **Homepage order is `products.createdAt` descending** — no featured/new flag. Collection piece counts are counted, never stored.
- **`product_images.alt` belongs to the row, not the asset** (the same URL is reused with different copy). `position` 0 is the packshot. `next/image` only has an Unsplash loader, so catalogue images must be `https://images.unsplash.com/…`.
- **Caching**: every storefront read in `products.ts` is `"use cache"` + `cacheLife("hours")` + `cacheTag("products")`. Admin writes call `updateTag("products")`; the webhook calls `revalidateTag("products", "max")` after fulfilment. Any new catalogue read must carry the same tag.
- **`SiteHeader` reads no session, on every route**, so the catalogue routes stay in the static shell. The greeting ("Hi, Jeff", from the first word of `user.name`) and the bag count come from `GET /api/me` (first name, admin flag, bag count — never email or id), fetched after hydration by `SessionSync` into the store in `src/lib/session-store.ts`. Bag actions return the new `itemCount` and push it with `setBagCount`; a slower `/api/me` answer never overwrites a newer count.
- **SEO**: titles use the root `title.template`; each indexable page sets its own `alternates.canonical` (the root sets none, or every page would inherit it) and uses `pageOpenGraph()`. JSON-LD is built from real data by `src/lib/seo.ts` — never ratings, reviews or a returns policy the store doesn't have. Private routes are `noindex` and in `robots.ts`. See `docs/seo.md`.

**Seed.** `scripts/seed.ts` is idempotent: it clears `product_variants` → `product_images` → `products` → `categories` and backdates `createdAt` from a fixed base date so ordering is reproducible. The extended catalogue (~330 unbranded pieces, watches/jewellery/fragrance collections) lives in `scripts/catalogue-extended.ts`; `npm run db:seed:extend` adds it to a live database without deleting anything (existing slugs are skipped). Every photo there was checked by eye for a visible maker's logo — keep it that way. Seeding bypasses `updateTag`, so delete `.next/cache/fetch-cache` (or restart dev) before rebuilding, or the "hours" cache serves the old catalogue.

**Auth.** Better Auth, email/password only.

- **Pages and actions read the session only through `src/lib/session.ts`** (`getCurrentUser`, `requireUser(next)`, `requireAdmin()`, `safeNext()` for every post-auth redirect). These are request-time: call them inside `<Suspense>`, never in `"use cache"`, never from `SiteHeader` or catalogue routes.
- **`src/proxy.ts` is optimistic only** — a session-cookie check on `/account`, `/admin`, `/bag`, `/checkout`. The DAL is the security boundary. Keep `/api/**` out of its matcher: Stripe sends no cookie.
- **Sign-in and sign-up post through `authClient` to `/api/auth/*`, not Server Actions**: rate limiting (DB-backed; 5 sign-ins / 3 sign-ups per minute per IP) and the origin check run only in the HTTP handler. Sign-out is a Server Action.
- **Roles**: `user.role` is `customer` | `admin`, declared to Better Auth with `input: false` so no request body can set it.
- **No session cookie cache, on purpose**: sign-out and role changes apply on the next request.

**Admin.** `requireAdmin()` answers non-admins with `notFound()` so the area doesn't advertise itself (inside a streamed `<Suspense>` this is a 404 page with HTTP 200 — expected). The layout check protects nothing on its own: every admin page and **every admin Server Action calls `requireAdmin()` first**, which `src/lib/admin-guard.test.ts` enforces statically. Actions re-validate every field with the pure `src/lib/admin-forms.ts` and name the product by slug. A product's slug and SKUs (`slug-colour-size`) are fixed once created; it is created with its full variant grid and packshot in one batch so the storefront never sees a product without either. Later the grid can widen (new colours/sizes), photos can be added/removed/reordered (never the last one), and stock is set per SKU as a **compare-and-set on the count the form showed**, so a webhook decrement in between is reported, not overwritten. Actions may keep the result (`const admin = await requireAdmin(…)`) to pass `admin.id` to `admin_audit_log`, which every back-office write records. Payment status is never writable from the admin; fulfilment (`unfulfilled → preparing → shipped → delivered`, paid orders only, `src/lib/fulfilment.ts`) is, through a guarded UPDATE that also writes `order_status_events`. Dashboards aggregate in SQL over UTC days (`src/lib/admin-period.ts`); definitions are in `src/lib/admin-metrics.ts` and shown on screen. Roles stay CLI-only; the only customer action is "sign out on all devices".

**Analytics.** `product_events` holds `view` / `click` (browser beacon to `/api/events`) and `add_to_bag` (server-side), one row per product, type, daily-rotating visitor hash and UTC day — no cookie, no stored IP. Checkouts and purchases are read from `order_items`, never duplicated as events. See `docs/analytics.md`.

**Bag and checkout.** The bag is DB-backed and signed-in only: `cart_items` is one row per (`user_id`, `variant_id`) under a UNIQUE that is also the upsert target — no guest bag, nothing to merge. Shapes the client needs live in `src/lib/cart-types.ts` so no `server-only` module reaches the bundle. **`cart_items` stores no price**; amounts are read live from `products.priceCents` at render and again when the Checkout Session is created. Bag actions take the user from the session and only a SKU and a quantity from the form.

Quantity rules are the pure `src/lib/cart-math.ts`: at most `min(stockQuantity, 10)`, or 10 for made-to-order; a quantity of 0 or less removes the line. Writes cap in SQL; `getBag()` re-caps on read and marks lines `reduced` / `unavailable` without writing. Nothing is reserved — stock moves only at fulfilment.

Checkout is Stripe-hosted with `price_data` built from a fresh `getBag()` read — no Stripe Price objects, no sync job. Line items and the order snapshot come from the same numbers (`src/lib/checkout-lines.ts`). Never pass `payment_method_types` (omitting it enables dynamic payment methods). Shipping is free, US only; no Stripe Tax until a registration exists. A `reduced` or `unavailable` line blocks checkout and sends the customer to `/bag?checkout=stock` — never silently change what they buy. Earlier `pending` orders of the same user have their sessions expired first, so two tabs can't both be paid.

**Orders.** An order is created `pending` (with its `order_items` snapshot) before the Checkout Session, and **only the webhook moves it on**; the success page only reads and proves nothing. The transition table is the pure `src/lib/order-status.ts`; a confirmed payment may lift a `cancelled` order to `paid` because the money was taken. Each event is applied as **one SQL statement** (data-modifying CTEs): the `stripe_events` record, the guarded status update, the stock decrement and the bag clean-up commit together or not at all. Idempotency: `stripe_events.id` PK, the status guard (a replay matches no row, so stock never moves twice), and the `orders.stripe_checkout_session_id` UNIQUE. A DB error returns 500 so Stripe retries. Stock decrements floor at zero; `amount_mismatch` and `oversold` flag what needs a human. The oversell window between two concurrent checkouts is accepted deliberately. Every applied transition also inserts an `order_status_events` row in the same statement. `charge.refunded` (`applyRefundEvent`, matched on `stripe_payment_intent_id`) raises `refunded_cents` with `greatest()` and turns the order `refunded` only when the whole charge is back (`refundTransition()`); stock is never restocked automatically.

**Env.** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the exact origin the browser uses — any other origin gets 403 `INVALID_ORIGIN`), `STRIPE_SECRET_KEY` (prefer a restricted `rk_` key), `STRIPE_WEBHOOK_SECRET`, optional `SUPPORT_EMAIL` (shown on `/help/contact`; without it the page says the address isn't set up). `BETTER_AUTH_URL` is also the canonical/sitemap origin and the origin `/api/events` accepts. Stripe vars are validated on first use, so the storefront builds and runs without them. Locally: `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded --forward-to localhost:3000/api/stripe/webhook` (current CLI versions refuse to start without `--events`).

Always respond in French.
