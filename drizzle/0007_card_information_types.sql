ALTER TABLE "sources" ADD COLUMN "default_card_type" text DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "type" text DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "investment_target" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "investors" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "investment_stage" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "investment_amount" numeric(24, 4);--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "investment_currency" text;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_default_card_type_valid" CHECK ("default_card_type" IN ('company', 'technology', 'policy', 'investment'));--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_type_valid" CHECK ("type" IN ('company', 'technology', 'policy', 'investment'));--> statement-breakpoint
UPDATE "sources" SET "default_card_type" = 'policy' WHERE "key" = 'kstartup';--> statement-breakpoint
UPDATE "cards" AS c
SET "type" = s."default_card_type"
FROM "source_items" AS si
INNER JOIN "sources" AS s ON s."id" = si."source_id"
WHERE c."primary_source_item_id" = si."id";--> statement-breakpoint
CREATE INDEX "cards_type_published_at_idx" ON "cards" USING btree ("type","published_at");
