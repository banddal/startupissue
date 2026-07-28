CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"tier" smallint NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text,
	"canonical_url" text,
	"url_hash" text,
	"title" text,
	"normalized_title" text,
	"title_hash" text,
	"body_text" text,
	"content_hash" text,
	"published_at" timestamp with time zone,
	"published_at_inferred" boolean DEFAULT false NOT NULL,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"status" text DEFAULT 'fetched' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"primary_source_item_id" uuid,
	"published_at" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"depth" text,
	"review_status" text DEFAULT 'pending_review' NOT NULL,
	"dedupe_status" text DEFAULT 'unique' NOT NULL,
	"merged_into_card_id" uuid,
	"sector_tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"body_truncated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error_type" text,
	"error_message" text,
	"cursor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source_item_id" uuid,
	"stage" text NOT NULL,
	"status" text NOT NULL,
	"attempt_no" integer NOT NULL,
	"error_type" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"source_item_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merge_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id_a" uuid NOT NULL,
	"card_id_b" uuid NOT NULL,
	"similarity" numeric(5, 4) NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_items" ADD CONSTRAINT "source_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_primary_source_item_id_source_items_id_fk" FOREIGN KEY ("primary_source_item_id") REFERENCES "public"."source_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_merged_into_card_id_cards_id_fk" FOREIGN KEY ("merged_into_card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_attempts" ADD CONSTRAINT "processing_attempts_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_attempts" ADD CONSTRAINT "processing_attempts_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sources" ADD CONSTRAINT "card_sources_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sources" ADD CONSTRAINT "card_sources_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_candidates" ADD CONSTRAINT "merge_candidates_card_id_a_cards_id_fk" FOREIGN KEY ("card_id_a") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_candidates" ADD CONSTRAINT "merge_candidates_card_id_b_cards_id_fk" FOREIGN KEY ("card_id_b") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merge_candidates" ADD CONSTRAINT "merge_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_key_unique" ON "sources" USING btree ("key");--> statement-breakpoint
CREATE INDEX "sources_enabled_idx" ON "sources" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "source_items_external_id_unique" ON "source_items" USING btree ("source_id", "external_id") WHERE "external_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "source_items_url_hash_unique" ON "source_items" USING btree ("source_id", "url_hash") WHERE "external_id" IS NULL AND "url_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "source_items_title_hash_unique" ON "source_items" USING btree ("source_id", "title_hash") WHERE "external_id" IS NULL AND "canonical_url" IS NULL AND "title_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "source_items_source_published_idx" ON "source_items" USING btree ("source_id", "published_at");--> statement-breakpoint
CREATE INDEX "source_items_normalized_title_trgm_idx" ON "source_items" USING gin ("normalized_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "cards_published_at_idx" ON "cards" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "cards_review_status_idx" ON "cards" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "cards_merged_into_card_id_idx" ON "cards" USING btree ("merged_into_card_id");--> statement-breakpoint
CREATE INDEX "ingestion_runs_source_started_idx" ON "ingestion_runs" USING btree ("source_id", "started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_runs_one_running_per_source" ON "ingestion_runs" USING btree ("source_id") WHERE "status" = 'running';--> statement-breakpoint
CREATE INDEX "processing_attempts_run_idx" ON "processing_attempts" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "processing_attempts_source_item_idx" ON "processing_attempts" USING btree ("source_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "processing_attempts_identity_unique" ON "processing_attempts" USING btree ("run_id", coalesce("source_item_id", '00000000-0000-0000-0000-000000000000'::uuid), "stage", "attempt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "card_sources_card_source_item_unique" ON "card_sources" USING btree ("card_id", "source_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "card_sources_primary_per_card_unique" ON "card_sources" USING btree ("card_id") WHERE "is_primary" = true;--> statement-breakpoint
CREATE INDEX "card_sources_source_item_idx" ON "card_sources" USING btree ("source_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merge_candidates_pair_unique" ON "merge_candidates" USING btree ("card_id_a", "card_id_b");--> statement-breakpoint
CREATE INDEX "merge_candidates_status_idx" ON "merge_candidates" USING btree ("status");--> statement-breakpoint
ALTER TABLE "merge_candidates" ADD CONSTRAINT "merge_candidates_ordered" CHECK ("merge_candidates"."card_id_a" < "merge_candidates"."card_id_b");
