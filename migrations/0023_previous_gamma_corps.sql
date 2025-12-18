CREATE TABLE "credit_account" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance_cents" integer DEFAULT 100 NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"stripe_customer_id" text,
	"default_payment_method_id" text,
	"auto_reload_enabled" boolean DEFAULT false NOT NULL,
	"auto_reload_threshold_cents" integer,
	"auto_reload_amount_cents" integer,
	"last_auto_reload_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"entry_type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'posted' NOT NULL,
	"reason" text NOT NULL,
	"external_source" varchar(64),
	"external_id" text,
	"metadata" jsonb,
	"balance_after_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_account" ADD CONSTRAINT "credit_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_account_stripe_customer_unique" ON "credit_account" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_idx" ON "credit_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_created_at_idx" ON "credit_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_external_unique" ON "credit_ledger" USING btree ("external_source","external_id");
--> statement-breakpoint
INSERT INTO "credit_account" ("user_id")
SELECT "id" FROM "user"
ON CONFLICT DO NOTHING;
