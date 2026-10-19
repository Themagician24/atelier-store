# SEO: what is in place and how to check it

Search engines decide rankings. This setup makes the store easy to crawl, understand and display; it does not and cannot guarantee a position on Google.

## What the site emits

| Item | Where | Notes |
|---|---|---|
| Titles | every page, `title.template` "%s — Atelier" in `src/app/layout.tsx` | Unique per product and collection, from the catalogue. |
| Meta descriptions | products (description, cut at 160 chars), collections (name + real piece count), static pages | `src/lib/seo.ts` |
| Canonical URLs | home, new arrivals, products, collections, help pages | Filtered and sorted collection URLs point to the plain collection URL. The root layout sets **no** canonical, on purpose (it would be inherited by every page). |
| Open Graph / Twitter | site default + `src/app/opengraph-image.tsx`; products and collections use their packshot | `pageOpenGraph()` in `src/lib/site.ts` restates site-wide fields because Next replaces, not merges, `openGraph`. |
| `sitemap.xml` | `src/app/sitemap.ts` | Static public pages, collections that hold at least one active product, active products with `lastModified`. Tagged `products`, so admin edits and archives refresh it. |
| `robots.txt` | `src/app/robots.ts` | Disallows `/account`, `/admin`, `/bag`, `/checkout`, `/api/`. `/_next/*` (CSS, JS, images) stays crawlable. |
| `noindex` | sign-in, sign-up, account, orders, bag, checkout, admin, `/search` (`noindex, follow`) | Search results are crawlable so the `noindex` can be seen. |
| JSON-LD | `Organization` + `WebSite` (with `SearchAction`) on every page; `Product` (one `Offer` per SKU with real price, USD, live availability, free US shipping) + `BreadcrumbList` on products; `BreadcrumbList` + `ItemList` on collections | No `AggregateRating` or `Review`: the store has no reviews. No `MerchantReturnPolicy`: no published returns policy yet. |
| 404 | `src/app/not-found.tsx`; unknown, draft and archived products 404 | |
| Errors | `src/app/error.tsx`, `src/app/global-error.tsx` | |

The public origin is `BETTER_AUTH_URL`. **Set it to the production origin** (e.g. `https://www.example.com`) or canonical and sitemap URLs will be wrong.

## Performance (Core Web Vitals)

- **LCP**: the homepage hero and the product packshot use `preload` (Next 16 replaced `priority`). Catalogue pages are in the static shell (`○`/`◐` in the build output).
- **CLS**: images sit in fixed-ratio frames (`media-frame`); the header badge and account menu reserve their space; skeletons match the loaded layout.
- **INP**: the only new client work on storefront pages is one `fetch('/api/me')` after hydration and a `sendBeacon` on product views and card clicks.
- Images are served through the Unsplash loader with responsive `sizes`; Unsplash returns modern formats.

## How to check

1. **Google Search Console**: add the domain property, submit `https://<domain>/sitemap.xml`, then watch *Pages* (indexed vs excluded; the private pages should show as "Excluded by noindex" or "Blocked by robots.txt") and *Enhancements → Products / Breadcrumbs*.
2. **Rich Results Test** (<https://search.google.com/test/rich-results>): test a product URL and a collection URL. Expect *Product snippets*, *Merchant listings* and *Breadcrumbs* with no errors. A warning about missing reviews or return policy is expected and correct.
3. **Schema Markup Validator** (<https://validator.schema.org/>): paste a product URL; expect `Product`, `Offer`s, `BreadcrumbList`, `Organization`, `WebSite`.
4. **PageSpeed Insights** (<https://pagespeed.web.dev/>): run the homepage, a collection and a product on mobile. Field data appears only once the site has enough real traffic.
5. Locally: `npm run build && npx next start`, then open `/sitemap.xml`, `/robots.txt`, and view-source on a product page (search for `canonical`, `og:image`, `application/ld+json`).

Re-run 2–4 after any change to product pages, metadata or images.
