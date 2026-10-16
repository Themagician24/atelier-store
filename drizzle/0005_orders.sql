CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"sku" text NOT NULL,
	"product_slug" text NOT NULL,
	"product_name" text NOT NULL,
	"colour" text NOT NULL,
	"size" text NOT NULL,
	"image_url" text,
	"made_to_order" boolean NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	CONSTRAINT "order_items_order_variant_key" UNIQUE("order_id","variant_id"),
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"shipping_address" jsonb,
	"amount_mismatch" boolean DEFAULT false NOT NULL,
	"oversold" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference"),
	CONSTRAINT "orders_stripeCheckoutSessionId_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('pending', 'processing', 'paid', 'payment_failed', 'expired', 'cancelled')),
	CONSTRAINT "orders_subtotal_cents_check" CHECK ("orders"."subtotal_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_id_created_at_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");