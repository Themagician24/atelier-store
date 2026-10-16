import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Stateless HTTP driver: no interactive transactions, use db.batch().
export const db = drizzle({
  client: neon(process.env.DATABASE_URL),
  schema,
  casing: "snake_case",
});
