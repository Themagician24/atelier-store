import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

// The only way pages and actions read the session. Every call validates
// against the session table — the proxy's cookie check is never enough.
// Request-time: call these behind a <Suspense> boundary, never in
// "use cache", and never from the header or the catalogue routes.

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
};

/** One database read per request, however many components ask. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role === "admin" ? "admin" : "customer" };
});

/** Signed-in user, or a redirect to sign-in that returns to `next`. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Admin, or a 404 for everyone else so the area doesn't advertise itself.
 * Every admin Server Action and Route Handler calls this first — a layout
 * check does not protect actions.
 */
export async function requireAdmin(next = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== "admin") notFound();
  return user;
}

/** A same-site path to return to after auth; anything else falls back. */
export function safeNext(raw: unknown, fallback = "/account"): string {
  if (typeof raw !== "string") return fallback;
  // One leading slash only: "//host" and "/\host" are protocol-relative.
  if (!/^\/(?![/\\])/.test(raw)) return fallback;
  return raw;
}
