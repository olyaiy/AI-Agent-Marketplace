CREATE TABLE "agent_knowledge" (
	"agent_tag" varchar(64) NOT NULL,
	"knowledge_id" text NOT NULL,
	"order" varchar(16) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledgebase" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"type" varchar(32) DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agent_tag_agent_tag_fk" FOREIGN KEY ("agent_tag") REFERENCES "public"."agent"("tag") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_knowledge_id_knowledgebase_id_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledgebase"("id") ON DELETE cascade ON UPDATE no action;