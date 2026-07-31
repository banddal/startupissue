CREATE TABLE "card_quality_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"verdict" text NOT NULL,
	"note" text,
	"score_snapshot" integer,
	"rule_version" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "card_quality_reviews" ADD CONSTRAINT "card_quality_reviews_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_quality_reviews" ADD CONSTRAINT "card_quality_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_quality_reviews_card_reviewer_unique" ON "card_quality_reviews" USING btree ("card_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "card_quality_reviews_verdict_idx" ON "card_quality_reviews" USING btree ("verdict");
