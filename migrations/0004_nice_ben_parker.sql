ALTER TABLE "agent" ALTER COLUMN "model" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "agent" ALTER COLUMN "model" SET DEFAULT 'google/gemini-2.0-flash-lite';