import { createHmac } from "node:crypto";
import { productEventTypes, type ProductEventType } from "@/db/schema";

/*
 * Pure rules for first-party product analytics. Nothing is stored on the
 * visitor's device: a visitor is a daily HMAC of what the request already
 * carries, keyed by a server secret, so it can't be reversed to an IP and
 * can't be linked across days. A reload the same day maps to the same row
 * and is dropped by the UNIQUE on product_events.
 */

/** Events the browser may send. add_to_bag is recorded by the server only. */
export const browserEventTypes = ["view", "click"] as const satisfies readonly ProductEventType[];
export type BrowserEventType = (typeof browserEventTypes)[number];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_EVENT_BODY = 512;

export type ParsedEvent = { slug: string; type: BrowserEventType };

/** The beacon body, or null for anything malformed. */
export function parseEvent(raw: unknown): ParsedEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { slug, type } = raw as Record<string, unknown>;
  if (typeof slug !== "string" || slug.length > 120 || !SLUG.test(slug)) return null;
  if (!(browserEventTypes as readonly unknown[]).includes(type)) return null;
  return { slug, type: type as BrowserEventType };
}

export function isProductEventType(value: unknown): value is ProductEventType {
  return (productEventTypes as readonly unknown[]).includes(value);
}

// Crawlers, link unfurlers, headless browsers and monitoring. Not exhaustive;
// it keeps the obvious automated traffic out of the counts.
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|monitor|curl|wget|python|httpclient|java\/|go-http/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT.test(userAgent);
}

/** The UTC calendar day, as the `date` column stores it. */
export function dayBucket(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/**
 * A visitor id that changes every UTC day. `parts` are the request's own
 * signals (IP and user agent for a browser, "user:<id>" for a signed-in
 * action); none of them is stored.
 */
export function visitorHash(
  secret: string,
  day: string,
  parts: readonly string[],
): string {
  return createHmac("sha256", `product-events:${secret}`)
    .update(`${day}|${parts.join("|")}`)
    .digest("hex")
    .slice(0, 32);
}

/** Ignore speculative loads: they are not someone looking at a product. */
export function isPrefetch(headers: Headers): boolean {
  const purpose = headers.get("sec-purpose") ?? headers.get("purpose") ?? "";
  return /prefetch|prerender/i.test(purpose) || headers.has("next-router-prefetch");
}
