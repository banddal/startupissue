CREATE TABLE "research_papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"authors" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"categories" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"primary_category" text,
	"abstract_url" text NOT NULL,
	"pdf_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "research_papers_provider_external_unique" ON "research_papers" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "research_papers_published_at_idx" ON "research_papers" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "research_papers_primary_category_idx" ON "research_papers" USING btree ("primary_category");
