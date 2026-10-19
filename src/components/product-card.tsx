import Image from "next/image";
import { Price } from "@/components/price";
import { TrackedProductLink } from "@/components/track-event";
import type { Product } from "@/lib/products";
import { stockCopy, stockTone } from "@/lib/stock";

export function ProductCard({
  product,
  sizes,
}: {
  product: Product;
  /** `sizes` for the image, matching the grid or rail the card sits in. */
  sizes: string;
}) {
  const [image] = product.images;

  return (
    // relative: anchors Price's sr-only spans, which would otherwise escape
    // a rail's scroll clip and widen the page.
    <TrackedProductLink slug={product.slug} className="group relative block">
      <div className="media-frame">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes={sizes}
          className="transition-transform duration-700 ease-standard motion-safe:group-hover:scale-103"
        />
      </div>
      {/* Name, colour, then price with any stock note on the same line, so
          every caption in a row is the same height. */}
      <div className="mt-3 flex flex-col pr-2">
        <h3 className="font-sans text-body">{product.name}</h3>
        <p className="text-body text-muted">
          {product.colours.length === 1
            ? product.colours[0]
            : `${product.colours.length} colours`}
        </p>
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
  );
}
