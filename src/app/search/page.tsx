import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Price } from "@/components/price";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackedProductLink } from "@/components/track-event";
import { searchProducts } from "@/lib/nav-search";
import { getNavigation } from "@/lib/products";
import { stockCopy, stockTone } from "@/lib/stock";

// Internal search results: useful to visitors, never a landing page for
// search engines (noindex), but the links on it may still be followed.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const MAX_QUERY = 80;

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <SiteHeader />
      <main className="shell flex-1 py-section">
        <h1 className="text-display mb-8">Search</h1>
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().slice(0, MAX_QUERY);
  // The same cached index and matching rules as the header's search dialog.
  const navigation = await getNavigation();
  const results = query ? searchProducts(navigation.products, query) : [];

  return (
    <>
      <form action="/search" method="get" role="search" className="mb-10 flex max-w-form gap-3">
        <label htmlFor="search-q" className="sr-only">
          Search the collection
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={MAX_QUERY}
          placeholder="Coat, black, bag…"
          className="field flex-1"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {!query ? (
        <p className="text-muted">Search by piece, colour or collection.</p>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p aria-live="polite" className="text-lead">
            Nothing matches &ldquo;{query}&rdquo;.
          </p>
          <p className="text-muted">Try a broader word, or browse the latest pieces.</p>
          <Link href="/new-arrivals" className="btn btn-secondary">
            New Arrivals
          </Link>
        </div>
      ) : (
        <>
          <p aria-live="polite" className="eyebrow mb-6 text-muted">
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
          </p>
          <ul className="product-grid">
            {results.map((product) => (
              <li key={product.slug}>
                <TrackedProductLink slug={product.slug} className="group relative block">
                  <div className="media-frame">
                    <Image
                      src={product.image.url}
                      alt={product.image.alt}
                      fill
                      sizes="(min-width: 64rem) 25vw, 50vw"
                      className="transition-transform duration-700 ease-standard motion-safe:group-hover:scale-103"
                    />
                  </div>
                  <div className="mt-3 flex flex-col pr-2">
                    <h2 className="font-sans text-body">{product.name}</h2>
                    <p className="text-body text-muted">{product.category.name}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-body">
                      <Price price={product.price} compareAt={product.compareAt} />
                      {product.stock !== "in-stock" && (
                        <p className={`text-ui ${stockTone[product.stock]}`}>
                          <span aria-hidden="true">· </span>
                          {stockCopy[product.stock]}
                        </p>
                      )}
                    </div>
                  </div>
                </TrackedProductLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true">
      <div aria-hidden="true" className="mb-10 h-12 max-w-form bg-mist" />
      <ul aria-hidden="true" className="product-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <div className="media-frame" />
            <div className="mt-3 h-4 w-3/4 bg-mist" />
          </li>
        ))}
      </ul>
    </div>
  );
}
