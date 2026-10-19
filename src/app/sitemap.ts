import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/products";
import { staticPublicPaths } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

// Public, indexable pages only: products on sale and the collections that
// hold them (from a read tagged "products", so an edit or archive in the
// admin refreshes it), plus the static pages. Account, bag, checkout, admin
// and search results are never listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  return [
    ...staticPublicPaths.map((path) => ({ url: absoluteUrl(path) })),
    ...entries.map((entry) => ({
      url: absoluteUrl(entry.path),
      lastModified: entry.lastModified,
    })),
  ];
}
