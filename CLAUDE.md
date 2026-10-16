# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Next dev server (rewrites the agent-rules block in AGENTS.md)
npm run build        # Production build — also the only full typecheck (tsc has noEmit)
npm run lint         # ESLint (flat config, eslint-config-next core-web-vitals + TS)
npm test             # Node's built-in runner via tsx: src/**/*.test.ts (pure modules only)

npm run db:generate  # Emit SQL migrations from src/db/schema.ts into ./drizzle
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema straight to the DB (no migration file) — dev only
npm run db:studio    # Drizzle Studio
npm run db:seed      # Re-seed the catalogue from scripts/seed.ts (clears it first)
```

## Architecture

Next.js 16 App Router + React 19, Tailwind v4 (PostCSS plugin only — no `tailwind.config`; theme lives in `src/app/globals.css`), TypeScript strict, `@/*` → `src/*`.

**Data layer.** `src/db/index.ts` creates a single `db` over Neon's HTTP driver (`drizzle-orm/neon-http`) and throws at import time if `DATABASE_URL` is missing. That driver is stateless HTTP — no interactive transactions, so batch via `db.batch()` rather than `db.transaction()`. `DATABASE_URL` must be the **pooled** Neon string.

**Schema.** `src/db/schema.ts` is the single schema file and the source of truth for `drizzle.config.ts`, the `db` client, and the Better Auth adapter. It holds the four Better Auth tables (`user`, `session`, `account`, `verification`) plus the catalogue (`categories`, `products`, `product_images`); every further application table belongs in the same file. Renaming or dropping the Better Auth columns breaks auth. Conventions: camelCase TS keys mapped to snake_case columns; `uuid` primary keys with `defaultRandom()` on application tables, with `slug` as the unique public identifier every route and React key uses; declare each foreign key's `relations()` alongside the table.

**Catalogue.** Schema decisions the storefront depends on:

- **Money is integer cents** (`priceCents`, `compareAtCents`). Only `mapProduct()` in `src/lib/products.ts` divides by 100; components receive dollars and never see the column.
- **Stock is a quantity plus a flag**, never a stored state: `product_variants.stockQuantity` per colour × size, `products.madeToOrder` per product. The product-level state is the sum across variants. The four states the UI speaks in are derived by `stockState()` in `src/lib/stock.ts`, which also owns `stockCopy` and `stockTone`. `stockDetail` is editorial free text beside them.
- **Homepage order comes from `products.createdAt` descending**, not from a featured or "new" flag — the grid takes the newest 8, the rail the next 5.
- **Categories carry the homepage "Collections" strip**: the ones with an `imageUrl` are what it renders, and piece counts are counted from `products`, never stored.
- **`product_images.alt` belongs to the row, not the asset** — the same URL is reused across products with different copy. `position` 0 is the packshot.
- Pages never touch `db` directly: they call the query functions in `src/lib/products.ts`, which return the mapped `Product` type. `src/lib/sample-data.ts` is now static chrome only (hero, atelier, services, nav) and holds no catalogue data.
- Drizzle relational queries: write the `with` block inline at each call site. Hoisting it into a shared `as const` config breaks result-shape inference.

**Migrations.** Versioned SQL committed under `drizzle/`, generated with `db:generate` and applied with `db:migrate`; `db:push` stays a dev-only escape hatch. Read the emitted SQL before applying it. `scripts/seed.ts` (run via `db:seed`, under `tsx` with `import "dotenv/config"`) is idempotent — it clears `product_images` → `products` → `categories` in that order, and backdates `createdAt` from a hardcoded base date so ordering is reproducible across runs.

**Auth.** Better Auth, email/password only. `src/lib/auth.ts` is the server instance (Drizzle adapter over the same schema, `transaction: false` for neon-http, `nextCookies()` last); `src/app/api/auth/[...all]/route.ts` serves it; `src/lib/auth-client.ts` is the same-origin React client for client components.

- **Pages and actions read the session only through `src/lib/session.ts`**: `getCurrentUser()` (React-`cache`d, one DB read per request), `requireUser(next)` (redirects to `/sign-in?next=`), `requireAdmin()` (`notFound()` for non-admins), and `safeNext()` for any post-auth redirect target. These are request-time: call them inside `<Suspense>`, never in `"use cache"`, never from `SiteHeader` or the catalogue routes. Every admin Server Action and Route Handler calls `requireAdmin()` itself — a page check doesn't protect actions.
- **`src/proxy.ts` is optimistic only** — it checks a session cookie exists on `/account/**` and `/admin/**`, nothing more. The DAL is the security boundary.
- **Sign-in and sign-up post through `authClient` to `/api/auth/*`, not Server Actions.** Rate limiting (DB-backed, `rate_limit` table; 5 sign-ins / 3 sign-ups per minute per IP) and the origin check run only in the HTTP handler; a direct `auth.api.signInEmail` call skips both. Sign-out is a Server Action (`src/app/(auth)/actions.ts`).
- **Roles**: `user.role` is `customer` | `admin` (CHECK constraint), declared to Better Auth with `input: false` so no request body can set it. Grant or revoke only with `npm run auth:role -- <email> <customer|admin>`.
- **No session cookie cache, on purpose**: every read hits `session`, so sign-out and role changes apply on the next request. Sessions last 30 days, rolling daily.

**Bag and checkout.** The bag is DB-backed and signed-in only — there is no `carts` table: `cart_items` holds one row per (`user_id`, `variant_id`) under a UNIQUE that is also the upsert target, so there is no guest bag and nothing to merge on sign-in. `src/lib/cart.ts` is the only module that touches `db` for carts, the way `src/lib/products.ts` owns the catalogue; its shapes live in `src/lib/cart-types.ts` so client components can import them without pulling a `server-only` module into the bundle. **`cart_items` stores no price** — amounts are read live from `products.priceCents` at render and again when the Checkout Session is created, so the browser never supplies a number that touches money.

Quantity rules live in `src/lib/cart-math.ts` (pure, unit-tested): a line holds at most `min(stockQuantity, 10)`, or 10 for made-to-order. Writes cap in SQL (`least(…)` on the upsert); `getBag()` re-caps on read and marks lines `reduced` / `unavailable` without writing — the next mutation persists the correction. Nothing is reserved: stock only moves at fulfilment. The actions in `src/app/bag/actions.ts` take the user from the session and only a SKU and a quantity from the form.

Checkout is Stripe-hosted: `startCheckout` in `src/lib/checkout.ts` posts an empty form, rebuilds `line_items` from a fresh `getBag()` read, and redirects to `session.url`. It uses `price_data` rather than Stripe Price objects — there is no `stripePriceId` column and no sync job, so the row we just read is the only source of truth for money. Line items and the order snapshot are built from the same numbers by the pure `src/lib/checkout-lines.ts`. Never pass `payment_method_types`; omitting it is what enables dynamic payment methods. Shipping is free (`SHIPPING_CENTS = 0`, inline `shipping_rate_data`, US addresses only); there is no Stripe Tax until a registration exists.

Before creating the session, any bag line that is `reduced` or `unavailable` blocks checkout: `reconcileBag()` saves the correction and the customer lands on `/bag?checkout=stock` to look before paying — never silently change what they buy. Earlier `pending` orders of the same user have their sessions expired first, so two tabs can't both be paid. Sessions expire after 60 minutes.

**An order is created `pending` when checkout starts and only the webhook moves it on** (`src/app/api/stripe/webhook/route.ts` → `applyCheckoutEvent` in `src/lib/orders.ts`). `orders` + `order_items` (the purchase-time snapshot, with our `subtotal_cents`) are written in one batch before the Checkout Session is created; the session carries `orderId` in `metadata`/`client_reference_id` and an idempotency key `checkout:<orderId>`. The success page (`/checkout/success`) only reads, scoped to the signed-in user — customers are not guaranteed to load it, and arriving there proves nothing.

Statuses: `pending → processing → paid | payment_failed`, `pending → expired`, `pending → cancelled` (replaced by a newer checkout). The transition table is the pure `src/lib/order-status.ts` (unit-tested); a confirmed payment may also lift a `cancelled` order to `paid`, because the money was taken. Events handled: `checkout.session.completed` (`paid` → fulfil, `unpaid` → `processing` for delayed methods), `async_payment_succeeded`, `async_payment_failed`, `expired`. Card declines happen on Stripe's page and change nothing here.

Each event is applied as **one SQL statement** (data-modifying CTEs) so the `stripe_events` record, the guarded status `UPDATE … WHERE status IN (…)`, the stock decrement and the bag clean-up commit together or not at all. Idempotency comes three ways: `stripe_events.id` PK (the pre-check SELECT is only a fast path), the status guard (a replay matches no row, so stock never moves twice), and the **`orders.stripe_checkout_session_id` UNIQUE constraint** the order is matched on alongside its id. A DB error returns 500 so Stripe retries. On payment, `amount_mismatch` is set if Stripe's `amount_subtotal`/currency differ from our snapshot, and `oversold` if any variant had less stock than ordered. Stock decrements skip `madeToOrder` rows and floor at zero with `greatest(…, 0)`: two customers can clear the pre-session check and both pay, and that oversell window is accepted deliberately — `oversold` is how the admin finds it. Keep `/api/**` out of `src/proxy.ts`'s matcher — Stripe sends no cookie and would get redirected.

**The header bag count has no number on the four catalogue routes.** `/`, `/new-arrivals`, `/collections/[slug]` and `/products/[slug]` pass no `bag` slot to `SiteHeader` on purpose: any server read of `headers()` in that shell makes them dynamic and kills `revalidate = 300` and `generateStaticParams`. Do not "fix" the missing count with a server component; fetch it from a client component after hydration if it is ever wanted there.

**Money formatting.** `currency` in `src/lib/format.ts` rounds to whole dollars and is **catalogue-only**. Anything derived from cents — bag, checkout, receipts — uses `formatCents`, or `$99.99` renders as `$100` next to a Stripe page that says otherwise.

Env: copy `.env.example` → `.env`. Auth needs `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL`, which must be the exact origin the browser uses — requests from any other origin get 403 `INVALID_ORIGIN`. Checkout additionally needs `STRIPE_SECRET_KEY` (prefer a restricted `rk_` key) and `STRIPE_WEBHOOK_SECRET` (from `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally, or the endpoint's own signing secret when deployed). `src/lib/stripe.ts` validates these on first use rather than at import, so the storefront still builds and runs without them — only checkout and the webhook fail.

## Next.js 16 notes

Route params and `searchParams` are Promises and must be awaited. Layouts/pages use the globally generated `LayoutProps<"/route">` / `PageProps<"/route">` types (see `src/app/layout.tsx`) — these are emitted into `.next/types`, so a route's types only exist after a dev server or build has run. Read `node_modules/next/dist/docs/` before relying on remembered APIs.

Always respond in French.
