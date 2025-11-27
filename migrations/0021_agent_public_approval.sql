ALTER TABLE "agent" ALTER COLUMN "visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_status" varchar(32) NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_requested_by" text REFERENCES "user"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_reviewed_by" text REFERENCES "user"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "publish_review_notes" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_publish_status_idx" ON "agent" ("publish_status");--> statement-breakpoint
UPDATE "agent" SET "publish_status" = 'approved' WHERE "visibility" = 'public';
