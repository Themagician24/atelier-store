import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCollections, getNewestProducts } from "@/lib/products";
import { unsplash } from "@/lib/unsplash";

const GRID_COUNT = 8;
const RAIL_COUNT = 5;

export default async function Home() {
  const [newest, more, collections] = await Promise.all([
    getNewestProducts({ limit: GRID_COUNT }),
    getNewestProducts({ limit: RAIL_COUNT, offset: GRID_COUNT }),
    getCollections(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Campaign: two portraits edge to edge; phones keep the first. */}
        <section className="hero">
          <div data-media className="grid md:grid-cols-2 md:gap-tile">
            <div className="relative">
              <Image
                src={unsplash("1539109136881-3be0616acf4b")}
                alt="A woman in a long powder-blue coat in a cathedral square"
                fill
                preload
                sizes="(min-width: 48rem) 50vw, 100vw"
                className="object-cover object-[50%_30%]"
              />
            </div>
            <div className="relative hidden md:block">
              <Image
                src={unsplash("1552374196-1ab2a1c593e8")}
                alt="A man in a camel blazer seated on a wooden stool"
                fill
                preload
                sizes="50vw"
                className="object-cover object-[50%_30%]"
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <p className="eyebrow">Autumn–Winter 2026</p>
            <h1 className="text-hero">The Long Coat</h1>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/collections/women" className="btn btn-on-image">
                Shop Women
              </Link>
              <Link href="/collections/men" className="btn btn-on-image">
                Shop Men
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="new-arrivals" className="shell py-section">
          <div className="section-bar">
            <h2 id="new-arrivals" className="text-title">
              New Arrivals
            </h2>
            <Link href="/new-arrivals" className="link-cta">
              View all
            </Link>
          </div>
          <ul className="product-grid">
            {newest.map((product) => (
              <li key={product.slug}>
                <ProductCard
                  product={product}
                  sizes="(min-width: 64rem) 25vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="knitwear" className="editorial-split">
          <div className="relative aspect-editorial overflow-hidden bg-mist">
            <Image
              src={unsplash("1558769132-cb1aea458c5e")}
              alt="Cable-knit and bouclé sweaters in cream and brown on a rail"
              fill
              sizes="(min-width: 48rem) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-6 bg-mist px-gutter py-section text-center">
            <p className="eyebrow text-muted">The Knitwear Edit</p>
            <h2 id="knitwear" className="max-w-reading text-display">
              Wool, cashmere, bouclé
            </h2>
            <p className="max-w-reading text-lead text-muted">
              Cable knits and brushed bouclé in undyed creams and tobacco
              browns, knitted in a single mill and finished by hand.
            </p>
            <Link href="/collections/women" className="link-cta">
              Discover the edit
            </Link>
          </div>
        </section>

        <section aria-labelledby="collections" className="shell py-section">
          <div className="section-bar">
            <h2 id="collections" className="text-title">
              Collections
            </h2>
          </div>
          <ul className="grid grid-cols-2 gap-x-tile gap-y-10 md:grid-cols-4">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-editorial overflow-hidden bg-mist">
                    <Image
                      src={collection.imageUrl}
                      alt={collection.imageAlt}
                      fill
                      sizes="(min-width: 48rem) 25vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-standard motion-safe:group-hover:scale-103"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <h3 className="text-title">{collection.name}</h3>
                    <p className="eyebrow text-muted">
                      {collection.pieceCount}{" "}
                      {collection.pieceCount === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="more" className="border-t py-section">
          <div className="shell">
            <div className="section-bar">
              <h2 id="more" className="text-title">
                Also New
              </h2>
            </div>
          </div>
          <ul className="rail mx-auto max-w-page">
            {more.map((product) => (
              <li key={product.slug}>
                <ProductCard
                  product={product}
                  sizes="(min-width: 80rem) 24vw, (min-width: 48rem) 31vw, 70vw"
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
