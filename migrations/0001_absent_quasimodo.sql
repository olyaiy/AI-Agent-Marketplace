CREATE TABLE "agent" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"system_prompt" text NOT NULL
);
--> statement-breakpoint
DROP TABLE "todo" CASCADE;