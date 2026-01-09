ALTER TABLE "conversation" ADD COLUMN "active_run_id" text;--> statement-breakpoint
CREATE INDEX "conversation_active_run_idx" ON "conversation" USING btree ("active_run_id");--> statement-breakpoint
