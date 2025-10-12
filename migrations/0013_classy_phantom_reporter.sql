ALTER TABLE "conversation" DROP CONSTRAINT "conversation_agent_tag_agent_tag_fk";
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_agent_tag_agent_tag_fk" FOREIGN KEY ("agent_tag") REFERENCES "public"."agent"("tag") ON DELETE cascade ON UPDATE no action;