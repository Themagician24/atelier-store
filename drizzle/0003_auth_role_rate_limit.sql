CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" in ('customer', 'admin'));