"use client";

import type { ImageLoaderProps } from "next/image";

/*
 * Global next/image loader. Catalogue photography is on Unsplash's imgix CDN,
 * which resizes and picks the format itself, so the browser fetches each
 * srcset width straight from it instead of through /_next/image.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src, "https://images.unsplash.com");
  if (url.hostname !== "images.unsplash.com") {
    throw new Error(`No image loader for ${url.hostname}`);
  }
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  return url.href;
}
