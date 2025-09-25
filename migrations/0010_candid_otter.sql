CREATE TABLE "conversation" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "agent_tag" varchar(64) NOT NULL,
  "title" text,
  "system_prompt_snapshot" text,
  "model_id" varchar(128) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_message_at" timestamp,
  "archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL,
  "role" varchar(16) NOT NULL,
  "ui_parts" jsonb NOT NULL,
  "text_preview" text,
  "has_tool_calls" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_agent_tag_agent_tag_fk" FOREIGN KEY ("agent_tag") REFERENCES "public"."agent"("tag") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_user_updated_idx" ON "conversation" ("user_id", "updated_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_conversation_seq_idx" ON "message" ("conversation_id", "created_at");


