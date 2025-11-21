ALTER TABLE "agent" ADD COLUMN "visibility" varchar(16) DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "invite_code" varchar(64);--> statement-breakpoint
CREATE INDEX "agent_visibility_idx" ON "agent" USING btree ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_invite_code_unique" ON "agent" USING btree ("invite_code");