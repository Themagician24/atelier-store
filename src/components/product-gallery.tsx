"use client";

import Image from "next/image";
import { useColourSelection } from "@/components/colour-selection";
import type { ProductImage } from "@/lib/products";

/*
 * One large photo with every view of the piece as thumbnails: a row under
 * it on phones, a column beside it from md, where it stays above the fold.
 * The large photo follows the selected colour, falling back to the packshot
 * for colours without a photo; a colourway thumbnail selects its colour.
 */
export function ProductGallery({
  images,
  sizes,
}: {
  images: ProductImage[];
  sizes: string;
}) {
  const { selection, select } = useColourSelection();
  const main =
    images.find((image) => image.url === selection.url) ??
    images.find((image) => image.colour === selection.colour) ??
    images[0];

  if (images.length === 1) {
    return (
      <div className="media-frame">
        <Image src={main.url} alt={main.alt} fill sizes={sizes} preload />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-tile md:grid md:grid-cols-[1fr_5fr]">
      <div className="media-frame">
        <Image
          src={main.url}
          alt={main.alt}
          fill
          sizes={sizes}
          preload={main === images[0]}
        />
      </div>

      <ul
        aria-label="Product images"
        className="grid grid-cols-4 gap-tile md:order-first md:grid-cols-1 md:content-start"
      >
        {images.map((image) => {
          const current = image === main;
          return (
            <li key={image.url}>
              <button
                type="button"
                aria-label={image.alt}
                aria-pressed={current}
                onClick={() =>
                  select(
                    image.colour
                      ? { colour: image.colour, url: null }
                      : { colour: selection.colour, url: image.url },
                  )
                }
                className={`media-frame block w-full cursor-pointer transition-opacity duration-200 ease-standard focus-visible:outline focus-visible:outline-offset-3 focus-visible:outline-ink ${current ? "" : "opacity-60 hover:opacity-100"}`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="(min-width: 80rem) 11vw, (min-width: 48rem) 10vw, 25vw"
                />
                {current && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-ink"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
