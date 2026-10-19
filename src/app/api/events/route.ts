import {
  isLikelyBot,
  isPrefetch,
  MAX_EVENT_BODY,
  parseEvent,
} from "@/lib/analytics-events";
import { allowEvent, recordProductEvent } from "@/lib/analytics";
import { siteUrl } from "@/lib/site";

/*
 * Product view and card-click beacons. Always 204: the page never waits on
 * this and a probe learns nothing. Writes only when the request comes from
 * our own pages, isn't a bot or a prefetch, and names an active product.
 * No cookie is read or set and no IP is stored (see analytics-events.ts).
 */
export async function POST(request: Request): Promise<Response> {
  const done = new Response(null, { status: 204 });

  const origin = request.headers.get("origin");
  if (origin !== new URL(siteUrl()).origin) return done;
  if (isLikelyBot(request.headers.get("user-agent"))) return done;
  if (isPrefetch(request.headers)) return done;

  const text = await request.text().catch(() => "");
  if (text.length === 0 || text.length > MAX_EVENT_BODY) return done;

  let event;
  try {
    event = parseEvent(JSON.parse(text));
  } catch {
    return done;
  }
  if (!event) return done;

  // The client IP as the hosting platform reports it (Vercel sets both
  // headers itself). Behind a proxy that passes a client-sent
  // X-Forwarded-For through, the rate limit below is only as good as that.
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  try {
    // Varying the user agent makes new "visitors", so the cap is per IP.
    if (!(await allowEvent(ip))) return done;
    await recordProductEvent({
      slug: event.slug,
      type: event.type,
      identity: [ip, request.headers.get("user-agent") ?? ""],
    });
  } catch (error) {
    // Analytics must never break the storefront; log without the payload.
    console.error("product event not recorded", (error as Error).name);
  }
  return done;
}
