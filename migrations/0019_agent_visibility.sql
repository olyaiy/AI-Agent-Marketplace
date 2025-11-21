ALTER TABLE "agent" ADD COLUMN "visibility" varchar(16) NOT NULL DEFAULT 'public';
ALTER TABLE "agent" ADD COLUMN "invite_code" varchar(64);

CREATE INDEX IF NOT EXISTS "agent_visibility_idx" ON "agent" ("visibility");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_invite_code_unique" ON "agent" ("invite_code");
