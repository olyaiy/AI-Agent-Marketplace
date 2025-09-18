ALTER TABLE "agent" ADD COLUMN "tag" varchar(64) PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" DROP COLUMN "id";