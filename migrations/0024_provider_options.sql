ALTER TABLE "agent" ADD COLUMN "provider_options" jsonb DEFAULT '{}'::jsonb NOT NULL;
