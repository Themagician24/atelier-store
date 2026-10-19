"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type { BrowserEventType } from "@/lib/analytics-events";

/*
 * First-party product analytics: a beacon to /api/events, nothing stored on
 * the device. The server drops repeats from the same visitor the same day,
 * bots and prefetches. Failures are silent: the page never depends on it.
 */
export function sendProductEvent(slug: string, type: BrowserEventType): void {
  const body = JSON.stringify({ slug, type });
  // text/plain is a CORS-safelisted type: some browsers throw on a beacon
  // sent as application/json. The server parses the text itself.
  try {
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => undefined);
}

/** One view per mount of a product page. */
export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    sendProductEvent(slug, "view");
  }, [slug]);
  return null;
}

/** A product link that reports the click, for cards in grids and rails. */
export function TrackedProductLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/products/${slug}`}
      className={className}
      onClick={() => sendProductEvent(slug, "click")}
    >
      {children}
    </Link>
  );
}
