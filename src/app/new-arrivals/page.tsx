import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getNewestProducts } from "@/lib/products";

// Six full rows at four columns, twelve at two: no orphan row either way.
const PAGE_COUNT = 24;

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "The latest pieces from the ateliers, newest first. Free shipping across the US.",
  alternates: { canonical: "/new-arrivals" },
};

export default async function NewArrivalsPage() {
  const products = await getNewestProducts({ limit: PAGE_COUNT });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section aria-labelledby="page-title" className="shell py-section">
          <div className="section-head">
            <nav aria-label="Breadcrumb">
              <ol className="eyebrow flex gap-2 text-muted">
                <li>
                  <Link href="/" className="link-quiet">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">New Arrivals</li>
              </ol>
            </nav>
            <h1 id="page-title" className="text-display">
              New Arrivals
            </h1>
            <p className="max-w-reading text-lead text-muted">
              The latest pieces from the ateliers, newest first.
            </p>
          </div>

          {products.length > 0 ? (
            <>
              <p className="eyebrow mb-6 text-muted">
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </p>
              <ul className="product-grid">
                {products.map((product) => (
                  <li key={product.slug}>
                    <ProductCard
                      product={product}
                      sizes="(min-width: 64rem) 25vw, 50vw"
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6 text-center">
              <p className="max-w-reading text-muted">
                Nothing new just yet. The next pieces are on the cutting table.
              </p>
              <Link href="/" className="btn btn-primary">
                Back to the homepage
              </Link>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
