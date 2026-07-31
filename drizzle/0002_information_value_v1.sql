ALTER TABLE "cards" ADD COLUMN "information_value_score" integer;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "information_value_reason" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "information_value_badge" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "information_value_rule_version" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "information_value_assessed_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "information_value_rule_versions" (
	"version" text PRIMARY KEY NOT NULL,
	"weights" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "card_value_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"rule_version" text NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"reason" text NOT NULL,
	"badge" text NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "card_value_assessments" ADD CONSTRAINT "card_value_assessments_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_value_assessments" ADD CONSTRAINT "card_value_assessments_rule_version_information_value_rule_versions_version_fk" FOREIGN KEY ("rule_version") REFERENCES "public"."information_value_rule_versions"("version") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "information_value_one_active" ON "information_value_rule_versions" USING btree ("active") WHERE "information_value_rule_versions"."active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "card_value_assessments_card_rule_unique" ON "card_value_assessments" USING btree ("card_id","rule_version");--> statement-breakpoint
CREATE INDEX "card_value_assessments_score_idx" ON "card_value_assessments" USING btree ("score");--> statement-breakpoint
CREATE INDEX "cards_information_value_idx" ON "cards" USING btree ("information_value_score","published_at");
