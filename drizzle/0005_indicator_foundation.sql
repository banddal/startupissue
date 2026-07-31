CREATE TABLE "indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"group" text NOT NULL,
	"unit" text NOT NULL,
	"cadence" text NOT NULL,
	"source_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "indicator_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"period" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"value" numeric(24, 4),
	"previous_value" numeric(24, 4),
	"change_value" numeric(24, 4),
	"status" text DEFAULT 'available' NOT NULL,
	"source_label" text,
	"source_url" text,
	"observed_at" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "indicators_code_unique" ON "indicators" USING btree ("code");--> statement-breakpoint
CREATE INDEX "indicators_group_active_idx" ON "indicators" USING btree ("group","active");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_values_indicator_period_unique" ON "indicator_values" USING btree ("indicator_id","period");--> statement-breakpoint
CREATE INDEX "indicator_values_period_idx" ON "indicator_values" USING btree ("period");--> statement-breakpoint
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_status_value_consistent" CHECK (("indicator_values"."status" = 'unavailable' and "indicator_values"."value" is null) or ("indicator_values"."status" <> 'unavailable' and "indicator_values"."value" is not null));--> statement-breakpoint
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_period_ordered" CHECK ("indicator_values"."period_start" <= "indicator_values"."period_end");--> statement-breakpoint
INSERT INTO "indicators" ("code", "name", "description", "group", "unit", "cadence", "display_order")
VALUES
	('ecosystem_company_count', '섹터 내 기업 수', '승인된 섹터 기업 명부 수', 'ecosystem', '개사', 'monthly', 10),
	('ecosystem_venture_investment', '벤처투자 총액', '승인된 공식 소스의 기간별 벤처투자 총액', 'ecosystem', '억원', 'quarterly', 20),
	('ecosystem_new_papers', '신규 논문', '승인된 섹터 검색식에 일치하는 신규 논문 수', 'ecosystem', '건', 'monthly', 30),
	('ecosystem_new_patents', '신규 특허', '승인된 섹터 검색식에 일치하는 신규 특허 수', 'ecosystem', '건', 'monthly', 40)
ON CONFLICT ("code") DO NOTHING;
