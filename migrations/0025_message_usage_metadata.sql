ALTER TABLE "message" ADD COLUMN "model_id" varchar(128);
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "generation_id" text;
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "gateway_cost_usd" numeric(12,8);
