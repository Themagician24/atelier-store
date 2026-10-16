import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Optimistic only: checks a session cookie exists, not that it's valid.
// The real check is requireUser()/requireAdmin() in src/lib/session.ts.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

// Protected areas only. /api/** stays out: Stripe sends no cookie.
export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/bag/:path*",
    "/checkout/:path*",
  ],
};
