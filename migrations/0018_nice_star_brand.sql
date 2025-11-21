CREATE TABLE "home_row" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"max_items" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_row_agent" (
	"row_id" text NOT NULL,
	"agent_tag" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "home_row_agent_row_id_agent_tag_pk" PRIMARY KEY("row_id","agent_tag")
);
--> statement-breakpoint
ALTER TABLE "home_row_agent" ADD CONSTRAINT "home_row_agent_row_id_home_row_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."home_row"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_row_agent" ADD CONSTRAINT "home_row_agent_agent_tag_agent_tag_fk" FOREIGN KEY ("agent_tag") REFERENCES "public"."agent"("tag") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_row_slug_idx" ON "home_row" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "home_row_slug_unique" ON "home_row" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "home_row_sort_idx" ON "home_row" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "home_row_agent_sort_idx" ON "home_row_agent" USING btree ("row_id","sort_order");--> statement-breakpoint
INSERT INTO "home_row" ("id", "title", "slug", "is_published", "sort_order")
VALUES ('featured-default', 'Featured Agents', 'featured', true, 0)
ON CONFLICT ("slug") DO NOTHING;
