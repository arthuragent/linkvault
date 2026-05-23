CREATE TABLE "linkvault_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"emoji" text,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linkvault_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"category_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "linkvault_links" ADD CONSTRAINT "linkvault_links_category_id_linkvault_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."linkvault_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "linkvault_categories_parent_idx" ON "linkvault_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "linkvault_links_category_idx" ON "linkvault_links" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "linkvault_links_created_idx" ON "linkvault_links" USING btree ("created_at");