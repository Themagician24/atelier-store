import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCategory, getCategorySlugs } from "@/lib/products";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  return {
    title: `${category.name} — Atelier`,
    description: `${category.name} at Atelier, newest pieces first.`,
  };
}

export default function CollectionPage({
  params,
}: PageProps<"/collections/[slug]">) {
  // Same split as the product page: header and footer are the static shell,
  // everything that reads the slug streams in behind the fallback.
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<CollectionSkeleton />}>
          <CollectionDetails params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function CollectionDetails({
  params,
}: {
  params: PageProps<"/collections/[slug]">["params"];
}) {
  const category = await getCategory((await params).slug);
  if (!category) notFound();

  const { products } = category;

  return (
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
            <li aria-current="page">{category.name}</li>
          </ol>
        </nav>
        <h1 id="page-title" className="text-display">
          {category.name}
        </h1>
      </div>

      {products.length > 0 ? (
        <>
          <div className="section-bar">
            <p className="eyebrow text-muted">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
            <Link href="/new-arrivals" className="link-cta">
              New Arrivals
            </Link>
          </div>
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
            Nothing here just yet. The first pieces are on the cutting table.
          </p>
          <Link href="/new-arrivals" className="btn btn-primary">
            See the latest arrivals
          </Link>
        </div>
      )}
    </section>
  );
}

/** Same header and grid as the loaded page, so nothing jumps when it streams in. */
function CollectionSkeleton() {
  return (
    <div aria-busy="true" className="shell py-section">
      <div className="section-head">
        <div className="h-3 w-32 bg-mist" />
        <div className="h-12 w-64 bg-mist" />
      </div>
      <ul className="product-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <div className="media-frame" />
            <div className="mt-3 h-4 w-3/4 bg-mist" />
          </li>
        ))}
      </ul>
    </div>
  );
}
