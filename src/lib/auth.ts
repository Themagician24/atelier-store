import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Secret and base URL come from BETTER_AUTH_SECRET / BETTER_AUTH_URL.
// Pages and actions don't import this: they go through src/lib/session.ts.
export const auth = betterAuth({
  appName: "Atelier",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
    // neon-http has no interactive transactions.
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // input: false — a sign-up body carrying `role` is ignored.
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  // No cookieCache: every session read hits the database, so sign-out and
  // role changes apply on the very next request.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  // Only the HTTP handler is rate-limited, never direct auth.api calls —
  // which is why the sign-in and sign-up forms post to /api/auth.
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  // Must stay last.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
