# Product analytics and admin metrics

## What is recorded

| Event | Recorded by | When |
|---|---|---|
| `view` | `TrackView` on the product page → `POST /api/events` | Once per mount of a product page |
| `click` | `TrackedProductLink` (product cards, search results) → `POST /api/events` | On click |
| `add_to_bag` | the `addToBag` Server Action, server-side | After the add succeeded |
| Checkouts | not an event: `order_items` of orders that reached Stripe | — |
| Purchases | not an event: `order_items` of orders the webhook marked paid | — |

Each row in `product_events` is unique per **(product, type, visitor, UTC day)**, so reloads and repeat clicks on the same day count once.

`/api/events` writes nothing when the `Origin` isn't the site's own, the user agent looks automated, the request is a prefetch, the body is malformed, or the product isn't active. It always answers `204`.

## Privacy (GDPR / ePrivacy)

- No cookie is set and nothing is written to the visitor's device (no localStorage either).
- The "visitor" is `HMAC-SHA256(secret, day | IP | user agent)`, truncated. The IP and user agent are **not stored**; the hash changes every UTC day and can't be linked across days or reversed without the server secret (derived from `BETTER_AUTH_SECRET`).
- For signed-in bag adds, the hash input is the user id, again not stored.
- No advertising or third-party tracker is loaded.

This is first-party audience measurement with no device storage. In most EU readings it doesn't need a consent banner, but **mention it in the privacy policy** (purpose: product statistics; data: daily pseudonymous hash; retention: decide one, e.g. 13 months, and purge older `product_events` rows).

## Limits, stated plainly

- Nothing before the first recorded event exists; the Insights page shows the start date and never estimates earlier figures.
- One person on two days counts as two visitors; two people behind one network with the same browser may count as one.
- Conversion = paid orders containing the product ÷ unique daily views **in the same period**. It isn't attributed: a purchase may follow a view from an earlier period. It's only shown for products with at least 20 views.

## Dashboard definitions

The definitions are shown under each dashboard (`src/lib/admin-metrics.ts`). In short:

- **Gross revenue**: Stripe's `amount_total` of orders paid in the period, by payment date, including orders later refunded.
- **Refunds**: `orders.refunded_cents` from `charge.refunded`, dated by the latest refund.
- **Net**: gross − refunds. Stripe fees aren't deducted.
- **Average order value**: gross ÷ orders paid in the period.
- **Orders**: checkouts that reached Stripe, by placement date, split by their current status.
- **Inactive account**: older than 30 days and never opened a Stripe checkout.
- All periods are UTC calendar days.
