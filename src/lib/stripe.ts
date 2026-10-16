import "server-only";
import Stripe from "stripe";

/*
 * Validated on first use, not at import: the storefront builds and runs
 * without Stripe keys, and only checkout and the webhook fail. Prefer a
 * restricted key (rk_) with write access to Checkout Sessions only.
 */

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key, {
    apiVersion: "2026-08-26.dahlia",
    appInfo: { name: "atelier-store" },
  });
  return client;
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

/** The exact origin the browser uses; the same one Better Auth trusts. */
export function siteOrigin(): string {
  const origin = process.env.BETTER_AUTH_URL;
  if (!origin) throw new Error("BETTER_AUTH_URL is not set");
  return origin.replace(/\/+$/, "");
}
