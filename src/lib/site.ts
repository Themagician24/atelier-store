// The public origin: canonical URLs, the sitemap, Open Graph, and the
// same-origin check on /api/events. BETTER_AUTH_URL already has to be the
// exact origin the browser uses, so it is reused rather than adding a second
// variable that could drift from it.

export const SITE_NAME = "Atelier";
export const SITE_DESCRIPTION =
  "Ready-to-wear, bags and shoes, made in small runs. Free shipping across the US.";

export function siteUrl(): string {
  const raw = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** An absolute URL on this site for a path like "/products/x". */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Customer support address, if one is configured. Never invented. */
export function supportEmail(): string | null {
  const value = process.env.SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

type OpenGraphImage = { url: string; alt?: string; width?: number; height?: number };

/**
 * A page's Open Graph block. Next replaces the parent's openGraph object
 * rather than merging it, so the site-wide fields are restated here.
 */
export function pageOpenGraph(input: {
  path: string;
  title: string;
  description: string;
  images?: OpenGraphImage[];
}) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: "en_US",
    url: input.path,
    title: input.title,
    description: input.description,
    ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
  };
}
