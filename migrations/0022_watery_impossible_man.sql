ALTER TABLE "agent" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_status" varchar(32) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_requested_by" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_reviewed_by" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_review_notes" text;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_publish_requested_by_user_id_fk" FOREIGN KEY ("publish_requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_publish_reviewed_by_user_id_fk" FOREIGN KEY ("publish_reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_publish_status_idx" ON "agent" USING btree ("publish_status");