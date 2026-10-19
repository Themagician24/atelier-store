import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // No Next.js badge over the storefront in dev; build errors still show.
  devIndicators: false,
  partialPrefetching: true,
  images: {
    // Unsplash's CDN resizes for us; going through /_next/image meant
    // downloading full-size originals and timed out on a cold cache.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  turbopack: {
    // A stray lockfile in the home folder would otherwise be picked as the root.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
