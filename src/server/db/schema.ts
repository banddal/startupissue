import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";
import { USER_ROLES, USER_STATUSES } from "@/lib/auth-types";
import type { CompanyStatus } from "@/lib/companies";
import type { CardQualityVerdict } from "@/lib/card-quality";
import type { CardType } from "@/lib/card-types";

export const userRole = pgEnum("user_role", USER_ROLES);
export const userStatus = pgEnum("user_status", USER_STATUSES);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
    image: text("image"),
    role: userRole("role").notNull().default("member"),
    status: userStatus("status").notNull().default("pending"),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
);

export type SourceKind = "rss" | "api" | "html";
export type SourceItemStatus =
  | "fetched"
  | "normalized"
  | "parse_failed"
  | "carded"
  | "skipped";
export type IngestionRunStatus = "running" | "success" | "partial" | "failed";
export type ProcessingStage = "fetch" | "normalize" | "dedupe" | "card";
export type ProcessingStatus = "ok" | "retry" | "failed";
export type ReviewStatus = "auto" | "pending_review" | "approved" | "hidden";
export type DedupeStatus = "unique" | "has_candidates" | "merged_into";
export type MergeCandidateStatus = "open" | "merged" | "rejected";
export type CardDepth = "research" | "news" | "tech";
export type CompanyVerificationKind =
  | "government_program"
  | "tips"
  | "portfolio"
  | "demo_day"
  | "self_declared"
  | "other";
export type IndicatorGroup = "ecosystem" | "market" | "macro";
export type IndicatorCadence = "daily" | "monthly" | "quarterly" | "annual";
export type IndicatorValueStatus = "available" | "estimated" | "unavailable";
export type InformationValueBadge =
  | "major_change"
  | "new_signal"
  | "follow_up"
  | "reference";
export type InformationValueBreakdown = {
  sourceTier: { score: number; reason: string };
  freshness: { score: number; reason: string };
  duplicateRisk: { score: number; reason: string };
};

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    kind: text("kind").$type<SourceKind>().notNull(),
    tier: smallint("tier").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    defaultCardType: text("default_card_type")
      .$type<CardType>()
      .notNull()
      .default("company"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sources_key_unique").on(table.key),
    index("sources_enabled_idx").on(table.enabled),
  ],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    type: text("type").$type<CardType>().notNull().default("company"),
    investmentTarget: text("investment_target"),
    investors: text("investors").array().notNull().default(sql`ARRAY[]::text[]`),
    investmentStage: text("investment_stage"),
    investmentAmount: numeric("investment_amount", { precision: 24, scale: 4 }),
    investmentCurrency: text("investment_currency"),
    primarySourceItemId: uuid("primary_source_item_id").references(
      (): AnyPgColumn => sourceItems.id,
      { onDelete: "restrict" },
    ),
    publishedAt: timestamp("published_at", { mode: "date", withTimezone: true }).notNull(),
    collectedAt: timestamp("collected_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    depth: text("depth").$type<CardDepth>(),
    reviewStatus: text("review_status")
      .$type<ReviewStatus>()
      .notNull()
      .default("pending_review"),
    dedupeStatus: text("dedupe_status")
      .$type<DedupeStatus>()
      .notNull()
      .default("unique"),
    mergedIntoCardId: uuid("merged_into_card_id").references(
      (): AnyPgColumn => cards.id,
      { onDelete: "set null" },
    ),
    sectorTags: text("sector_tags").array().notNull().default(sql`ARRAY[]::text[]`),
    bodyTruncated: boolean("body_truncated").notNull().default(false),
    informationValueScore: integer("information_value_score"),
    informationValueReason: text("information_value_reason"),
    informationValueBadge: text("information_value_badge")
      .$type<InformationValueBadge>(),
    informationValueRuleVersion: text("information_value_rule_version"),
    informationValueAssessedAt: timestamp("information_value_assessed_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cards_published_at_idx").on(table.publishedAt),
    index("cards_type_published_at_idx").on(table.type, table.publishedAt),
    index("cards_review_status_idx").on(table.reviewStatus),
    index("cards_merged_into_card_id_idx").on(table.mergedIntoCardId),
    index("cards_information_value_idx").on(
      table.informationValueScore,
      table.publishedAt,
    ),
  ],
);

export const cardUserStates = pgTable(
  "card_user_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    important: boolean("important").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cardId] }),
    index("card_user_states_user_important_idx").on(
      table.userId,
      table.important,
    ),
  ],
);

export const notes = pgTable(
  "notes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cardId] }),
    index("notes_user_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

export const informationValueRuleVersions = pgTable(
  "information_value_rule_versions",
  {
    version: text("version").primaryKey(),
    weights: jsonb("weights").$type<Record<string, unknown>>().notNull(),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("information_value_one_active")
      .on(table.active)
      .where(sql`${table.active} = true`),
  ],
);

export const cardValueAssessments = pgTable(
  "card_value_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    ruleVersion: text("rule_version")
      .notNull()
      .references(() => informationValueRuleVersions.version, {
        onDelete: "restrict",
      }),
    score: integer("score").notNull(),
    breakdown: jsonb("breakdown").$type<InformationValueBreakdown>().notNull(),
    reason: text("reason").notNull(),
    badge: text("badge").$type<InformationValueBadge>().notNull(),
    evaluatedAt: timestamp("evaluated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("card_value_assessments_card_rule_unique").on(
      table.cardId,
      table.ruleVersion,
    ),
    index("card_value_assessments_score_idx").on(table.score),
  ],
);

export const cardQualityReviews = pgTable(
  "card_quality_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verdict: text("verdict").$type<CardQualityVerdict>().notNull(),
    note: text("note"),
    scoreSnapshot: integer("score_snapshot"),
    ruleVersion: text("rule_version"),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("card_quality_reviews_card_reviewer_unique").on(
      table.cardId,
      table.reviewerId,
    ),
    index("card_quality_reviews_verdict_idx").on(table.verdict),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`ARRAY[]::text[]`),
    sectorKey: text("sector_key").notNull(),
    status: text("status").$type<CompanyStatus>().notNull().default("candidate"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("companies_sector_normalized_name_unique").on(
      table.sectorKey,
      table.normalizedName,
    ),
    index("companies_sector_status_idx").on(table.sectorKey, table.status),
  ],
);

export const companyVerifications = pgTable(
  "company_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CompanyVerificationKind>().notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    observedAt: timestamp("observed_at", { mode: "date", withTimezone: true })
      .notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("company_verifications_company_idx").on(table.companyId),
    uniqueIndex("company_verifications_evidence_unique").on(
      table.companyId,
      table.kind,
      table.sourceName,
      table.observedAt,
    ),
  ],
);

export const indicators = pgTable(
  "indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    group: text("group").$type<IndicatorGroup>().notNull(),
    unit: text("unit").notNull(),
    cadence: text("cadence").$type<IndicatorCadence>().notNull(),
    sourceConfig: jsonb("source_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    displayOrder: smallint("display_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("indicators_code_unique").on(table.code),
    index("indicators_group_active_idx").on(table.group, table.active),
  ],
);

export const indicatorValues = pgTable(
  "indicator_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    periodStart: date("period_start", { mode: "date" }).notNull(),
    periodEnd: date("period_end", { mode: "date" }).notNull(),
    value: numeric("value", { precision: 24, scale: 4 }),
    previousValue: numeric("previous_value", { precision: 24, scale: 4 }),
    changeValue: numeric("change_value", { precision: 24, scale: 4 }),
    status: text("status")
      .$type<IndicatorValueStatus>()
      .notNull()
      .default("available"),
    sourceLabel: text("source_label"),
    sourceUrl: text("source_url"),
    observedAt: timestamp("observed_at", { mode: "date", withTimezone: true })
      .notNull(),
    collectedAt: timestamp("collected_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("indicator_values_indicator_period_unique").on(
      table.indicatorId,
      table.period,
    ),
    index("indicator_values_period_idx").on(table.period),
    check(
      "indicator_values_status_value_consistent",
      sql`(${table.status} = 'unavailable' and ${table.value} is null) or (${table.status} <> 'unavailable' and ${table.value} is not null)`,
    ),
    check(
      "indicator_values_period_ordered",
      sql`${table.periodStart} <= ${table.periodEnd}`,
    ),
  ],
);

export const researchPapers = pgTable(
  "research_papers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    authors: text("authors").array().notNull().default(sql`ARRAY[]::text[]`),
    categories: text("categories").array().notNull().default(sql`ARRAY[]::text[]`),
    primaryCategory: text("primary_category"),
    abstractUrl: text("abstract_url").notNull(),
    pdfUrl: text("pdf_url"),
    publishedAt: timestamp("published_at", { mode: "date", withTimezone: true })
      .notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    collectedAt: timestamp("collected_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("research_papers_provider_external_unique").on(
      table.provider,
      table.externalId,
    ),
    index("research_papers_published_at_idx").on(table.publishedAt),
    index("research_papers_primary_category_idx").on(table.primaryCategory),
  ],
);

export const sourceItems = pgTable(
  "source_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    externalId: text("external_id"),
    canonicalUrl: text("canonical_url"),
    urlHash: text("url_hash"),
    title: text("title"),
    normalizedTitle: text("normalized_title"),
    titleHash: text("title_hash"),
    bodyText: text("body_text"),
    contentHash: text("content_hash"),
    publishedAt: timestamp("published_at", { mode: "date", withTimezone: true }),
    publishedAtInferred: boolean("published_at_inferred").notNull().default(false),
    attachmentUrls: jsonb("attachment_urls").$type<string[]>().notNull().default([]),
    rawPayload: jsonb("raw_payload").$type<unknown>().notNull(),
    status: text("status").$type<SourceItemStatus>().notNull().default("fetched"),
    firstSeenAt: timestamp("first_seen_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("source_items_external_id_unique")
      .on(table.sourceId, table.externalId)
      .where(sql`${table.externalId} is not null`),
    uniqueIndex("source_items_url_hash_unique")
      .on(table.sourceId, table.urlHash)
      .where(sql`${table.externalId} is null and ${table.urlHash} is not null`),
    uniqueIndex("source_items_title_hash_unique")
      .on(table.sourceId, table.titleHash)
      .where(
        sql`${table.externalId} is null and ${table.canonicalUrl} is null and ${table.titleHash} is not null`,
      ),
    index("source_items_source_published_idx").on(table.sourceId, table.publishedAt),
    index("source_items_normalized_title_trgm_idx")
      .using("gin", sql`${table.normalizedTitle} gin_trgm_ops`),
  ],
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { mode: "date", withTimezone: true }),
    status: text("status").$type<IngestionRunStatus>().notNull().default("running"),
    fetchedCount: integer("fetched_count").notNull().default(0),
    newCount: integer("new_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    cursor: text("cursor"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ingestion_runs_source_started_idx").on(table.sourceId, table.startedAt),
    uniqueIndex("ingestion_runs_one_running_per_source")
      .on(table.sourceId)
      .where(sql`${table.status} = 'running'`),
  ],
);

export const processingAttempts = pgTable(
  "processing_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "cascade" }),
    sourceItemId: uuid("source_item_id").references(() => sourceItems.id, {
      onDelete: "set null",
    }),
    stage: text("stage").$type<ProcessingStage>().notNull(),
    status: text("status").$type<ProcessingStatus>().notNull(),
    attemptNo: integer("attempt_no").notNull(),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("processing_attempts_identity_unique")
      .on(
        table.runId,
        sql`coalesce(${table.sourceItemId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
        table.stage,
        table.attemptNo,
      ),
    index("processing_attempts_run_idx").on(table.runId),
    index("processing_attempts_source_item_idx").on(table.sourceItemId),
  ],
);

export const cardSources = pgTable(
  "card_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => sourceItems.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("card_sources_card_source_item_unique").on(table.cardId, table.sourceItemId),
    uniqueIndex("card_sources_primary_per_card_unique")
      .on(table.cardId)
      .where(sql`${table.isPrimary} = true`),
    index("card_sources_source_item_idx").on(table.sourceItemId),
  ],
);

export const mergeCandidates = pgTable(
  "merge_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardIdA: uuid("card_id_a")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    cardIdB: uuid("card_id_b")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    similarity: numeric("similarity", { precision: 5, scale: 4 }).notNull(),
    signals: jsonb("signals").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").$type<MergeCandidateStatus>().notNull().default("open"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("merge_candidates_ordered", sql`${table.cardIdA} < ${table.cardIdB}`),
    uniqueIndex("merge_candidates_pair_unique").on(table.cardIdA, table.cardIdB),
    index("merge_candidates_status_idx").on(table.status),
  ],
);

export type AppUser = typeof users.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type SourceItem = typeof sourceItems.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type ResearchPaper = typeof researchPapers.$inferSelect;
