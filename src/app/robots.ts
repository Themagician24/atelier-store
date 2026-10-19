import type { MetadataRoute } from "next";
import { privatePaths } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

// Scripts, styles and images (/_next/*) stay crawlable so pages render for
// search engines. Search results aren't disallowed: they carry a noindex,
// which a crawler can only see if it may fetch the page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...privatePaths] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
