import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";

/*
 * The only way to grant or revoke admin — no HTTP endpoint can set a role.
 * Usage: npm run auth:role -- <email> <customer|admin>
 * Takes effect on the user's next request (sessions are read from the DB).
 */

const ROLES = ["customer", "admin"] as const;

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as (typeof ROLES)[number])) {
    console.error("Usage: npm run auth:role -- <email> <customer|admin>");
    process.exit(1);
  }

  const updated = await db
    .update(user)
    .set({ role })
    .where(eq(user.email, email.trim().toLowerCase()))
    .returning({ email: user.email, role: user.role });

  if (updated.length === 0) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  console.log(`${updated[0].email} is now ${updated[0].role}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
