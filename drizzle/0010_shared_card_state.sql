ALTER TABLE "cards" ADD COLUMN "important" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "note" text;--> statement-breakpoint
CREATE INDEX "cards_important_published_at_idx" ON "cards" USING btree ("important","published_at");
