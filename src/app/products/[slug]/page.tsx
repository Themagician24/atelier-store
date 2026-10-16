import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ColourSelectionProvider } from "@/components/colour-selection";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductStage } from "@/components/product-3d/product-stage";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VariantPicker } from "@/components/variant-picker";
import { getProduct, getProductSlugs, getRelatedProducts } from "@/lib/products";
import { productModel } from "@/lib/product-models";

const RELATED_COUNT = 4;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: `${product.name} — Atelier`,
    description: product.description,
  };
}

export default function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  // Header and footer are the static shell; everything that reads the slug
  // streams in behind the fallback, so navigating here is instant.
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<ProductSkeleton />}>
          <ProductDetails params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function ProductDetails({
  params,
}: {
  params: PageProps<"/products/[slug]">["params"];
}) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, RELATED_COUNT);
  const model = productModel(product.slug);

  return (
    <ColourSelectionProvider initialColour={product.colours[0]}>
      <div className="md:grid md:grid-cols-[3fr_2fr] xl:grid-cols-[2fr_1fr]">
        {model ? (
          // The 3D stage leads; the photos follow once it has played.
          <div>
            <ProductStage
              kind={model}
              productName={product.name}
              poster={product.images[0]}
            />
            <ProductGallery
              images={product.images}
              sizes="(min-width: 80rem) 56vw, (min-width: 48rem) 50vw, 100vw"
            />
          </div>
        ) : (
          <ProductGallery
            images={product.images}
            sizes="(min-width: 80rem) 56vw, (min-width: 48rem) 50vw, 100vw"
          />
        )}

        {/* Stays in view while the gallery scrolls past. */}
        <section
          aria-labelledby="product-name"
          className="px-gutter py-10 md:sticky md:top-(--header-height) md:self-start md:py-section xl:px-12"
        >
          <nav aria-label="Breadcrumb">
            <ol className="eyebrow flex gap-2 text-muted">
              <li>
                <Link href="/" className="link-quiet">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/collections/${product.category.slug}`}
                  className="link-quiet"
                >
                  {product.category.name}
                </Link>
              </li>
            </ol>
          </nav>

          <h1 id="product-name" className="mt-6 text-title">
            {product.name}
          </h1>
          {product.colours.length === 1 && (
            <p className="mt-2 text-muted">{product.colours[0]}</p>
          )}

          <Price
            price={product.price}
            compareAt={product.compareAt}
            className="mt-6 text-lead"
          />

          <div className="mt-8">
            <VariantPicker
              variants={product.variants}
              productStock={product.stock}
              stockDetail={product.stockDetail}
            />
          </div>

          <p className="mt-8 max-w-reading text-muted">
            {product.description}
          </p>

          <div className="mt-10 border-b">
            <Disclosure title="Details" open>
              <ul className="flex flex-col gap-1">
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </Disclosure>
            <Disclosure title="Care">
              <p>{product.care}</p>
            </Disclosure>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="shell border-t py-section">
          <div className="section-head">
            <p className="eyebrow text-muted">{product.category.name}</p>
            <h2 id="related" className="text-display">
              You may also like
            </h2>
          </div>
          <ul className="product-grid">
            {related.map((item) => (
              <li key={item.slug}>
                <ProductCard
                  product={item}
                  sizes="(min-width: 64rem) 25vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </ColourSelectionProvider>
  );
}

/** Same columns as the loaded page, so nothing jumps when it streams in. */
function ProductSkeleton() {
  return (
    <div
      aria-busy="true"
      className="md:grid md:grid-cols-[3fr_2fr] xl:grid-cols-[2fr_1fr]"
    >
      <div className="media-frame" />
      <div className="flex flex-col gap-6 px-gutter py-10 md:py-section xl:px-12">
        <div className="h-3 w-32 bg-mist" />
        <div className="h-8 w-3/4 bg-mist" />
        <div className="h-5 w-20 bg-mist" />
      </div>
    </div>
  );
}

function Disclosure({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group border-t">
      <summary className="eyebrow flex min-h-14 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M0 6h12" />
          <path d="M6 0v12" className="group-open:hidden" />
        </svg>
      </summary>
      <div className="pb-6 text-muted">{children}</div>
    </details>
  );
}
