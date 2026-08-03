CREATE TABLE "card_user_states" (
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"important" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_user_states_user_id_card_id_pk" PRIMARY KEY("user_id","card_id")
);--> statement-breakpoint
ALTER TABLE "card_user_states" ADD CONSTRAINT "card_user_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_user_states" ADD CONSTRAINT "card_user_states_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_user_states_user_important_idx" ON "card_user_states" USING btree ("user_id","important");
