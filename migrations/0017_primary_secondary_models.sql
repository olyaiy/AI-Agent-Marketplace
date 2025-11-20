ALTER TABLE "agent" ADD COLUMN "secondary_models" jsonb DEFAULT '[]'::jsonb NOT NULL;
