# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Always respond in French.

## Tooling gotchas

- No test runner is configured. `npx tsc` is the fast typecheck, but `PageProps` / `LayoutProps` types live in `.next/types`, so it needs a prior `next dev` or `next build`.
- Tailwind v4 is compiled by the `@tailwindcss/turbopack` loader (`turbopack.rules` in `next.config.ts`). There is no PostCSS config and no `tailwind.config` — the theme lives in `src/app/globals.css`. Don't add either.
- Keep `turbopack.root` in `next.config.ts` and `typeRoots` in `tsconfig.json` pinned to the project: the home folder holds stray lockfiles and broken `@types` packages that would otherwise be picked up.
- Route params and `searchParams` are Promises. With `cacheComponents` on, route segment configs (`revalidate`, `dynamic`, `fetchCache`) are gone — cache with `"use cache"` + `cacheLife` / `cacheTag`. Read `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` before porting any pre-16 caching pattern.

## Target architecture (not built yet)

The repo is still a skeleton. Build against this spec; once a part exists in code, delete the parts of its description that the code now makes obvious.

**Stack to add.** Better Auth and Stripe. The catalogue (categories, products, variants, images) is live on Drizzle; reseed with `npm run db:seed`. Versioned SQL migrations are committed under `drizzle/`.

**Data layer.**

- `DATABASE_URL` must be the **pooled** Neon string.
- The HTTP driver has no interactive transactions: use `db.batch()`, never `db.transaction()`.
- `src/db/schema.ts` is the only schema file — Better Auth tables (`user`, `session`, `account`, `verification`; don't rename or drop their columns) plus every application table. camelCase TS keys → snake_case columns; `uuid` PKs with `defaultRandom()`; `slug` is the public identifier for routes and React keys; `relations()` declared next to each table.
- Drizzle relational queries: write the `with` block inline at each call site — hoisting it into a shared `as const` breaks result-shape inference.
- Pages never touch `db`. Catalogue queries live in `src/lib/products.ts` (returns the mapped `Product` type); carts in `src/lib/cart.ts`, with shapes in `src/lib/cart-types.ts` so client components avoid importing a `server-only` module. `src/lib/sample-data.ts` holds static chrome only, no catalogue data.

**Catalogue rules.**

- Money is integer cents (`priceCents`, `compareAtCents`). Only `mapProduct()` divides by 100; components get dollars.
- Stock is per variant (`product_variants`: one row per colour × size, with `stockQuantity` and a unique `sku`); `madeToOrder` stays on the product. The product-level state is `stockState()` over the summed variants, never stored. `stockState()` in `src/lib/stock.ts` derives the four UI states and owns `stockCopy` / `stockTone`. `stockDetail` is editorial free text.
- Homepage order is `products.createdAt` desc — newest 8 in the grid, next 5 in the rail. No featured/new flag.
- The "Collections" strip shows categories that have an `imageUrl`; piece counts are computed from `products`, never stored.
- `product_images.alt` belongs to the row (same URL reused with different copy). `position` 0 is the packshot.

**Formatting.** `currency` in `src/lib/format.ts` rounds to whole dollars and is catalogue-only. Bag, checkout and receipts use `formatCents`, or `$99.99` shows as `$100` next to Stripe's page.

**Auth.** `src/lib/auth.ts`: Drizzle adapter over the same schema, email/password, `nextCookies()` plugin so Server Actions can set cookies. Catch-all route `src/app/api/auth/[...all]/route.ts`. `src/lib/auth-client.ts` (keyed off `NEXT_PUBLIC_APP_URL`) is client-only; server code calls `auth.api.*` with `headers()`.

**Bag and checkout.**

- Bag is DB-backed, signed-in only (`carts.user_id` unique): no guest bag, nothing to merge on sign-in.
- `cart_items` references a `product_variants` row (the size and colour bought) and stores no price; amounts are read live from `products.priceCents` at render and again at checkout.
- `startCheckout` (`src/lib/checkout.ts`) rebuilds `line_items` from a fresh `getBag()` using `price_data` (no Stripe Price objects, no `stripePriceId`). Never pass `payment_method_types` — omitting it enables dynamic payment methods.

**Orders.**

- Created only by the webhook (`src/app/api/stripe/webhook/route.ts` → `fulfillCheckoutSession` in `src/lib/orders.ts`), never the success page.
- Handles `checkout.session.completed` and `checkout.session.async_payment_succeeded`; ignores sessions still `unpaid`.
- Idempotency comes from the UNIQUE on `orders.stripe_checkout_session_id`; the pre-check SELECT is only a fast path.
- `order_items` amounts come from Stripe's line items; other columns are purchase-time snapshots.
- Stock decrements hit `product_variants.stockQuantity` in the same `db.batch()`, skip `madeToOrder`, floor at zero with `greatest(…, 0)`. The resulting oversell window is accepted deliberately.
- Keep `/api/**` out of `src/proxy.ts`'s matcher — Stripe sends no cookie and would be redirected.

**Header bag count.** The catalogue routes (`/`, `/new-arrivals`, `/collections/[slug]`, `/products/[slug]`) render no bag count in `SiteHeader`: reading `headers()` or the session there pulls request-time work into the static shell. If it's ever needed, fetch it client-side after hydration or in its own `<Suspense>` outside any `"use cache"` scope.

**Env.** Ship a `.env.example`. `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must both equal the app origin. `STRIPE_SECRET_KEY` (prefer a restricted `rk_` key) and `STRIPE_WEBHOOK_SECRET` (from `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally) are validated lazily in `src/lib/stripe.ts`, so the storefront builds and runs without them.
