import { and, eq } from "drizzle-orm";

import {
  cards,
  cardValueAssessments,
  cardSources,
  informationValueRuleVersions,
  ingestionRuns,
  processingAttempts,
  sourceItems,
  sources,
} from "../src/server/db/schema";
import { makeSummary, normalizeItem } from "./core/normalize";
import {
  assessInformationValue,
  INFORMATION_VALUE_RULE_VERSION,
  INFORMATION_VALUE_WEIGHTS,
} from "./core/information-value";
import { createWorkerDatabase } from "./db";
import type { NormalizedSourceItem, RawSourceItem, SourceAdapter } from "./types";

type RunCounts = {
  fetched: number;
  created: number;
  updated: number;
  duplicate: number;
  failed: number;
};

function safeError(error: unknown): { type: string; message: string } {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      message: error.message.slice(0, 2_000),
    };
  }
  return { type: "UnknownError", message: "An unknown ingestion error occurred." };
}

function sourceDefinition(adapter: SourceAdapter) {
  return {
    key: adapter.key,
    name: adapter.name,
    kind: (adapter.key === "platum" ? "rss" : "api") as "rss" | "api",
    tier: adapter.key === "kstartup" ? 1 : 2,
    config: {},
    defaultCardType: adapter.defaultCardType,
    enabled: true,
  };
}

function itemIdentity(item: NormalizedSourceItem, sourceId: string) {
  if (item.externalId) {
    return and(
      eq(sourceItems.sourceId, sourceId),
      eq(sourceItems.externalId, item.externalId),
    );
  }
  if (item.urlHash) {
    return and(
      eq(sourceItems.sourceId, sourceId),
      eq(sourceItems.urlHash, item.urlHash),
    );
  }
  if (item.titleHash) {
    return and(
      eq(sourceItems.sourceId, sourceId),
      eq(sourceItems.titleHash, item.titleHash),
    );
  }
  throw new Error("Normalized item has no usable idempotency key.");
}

function sourceItemValues(
  item: NormalizedSourceItem,
  sourceId: string,
  status: "normalized" | "carded",
) {
  return {
    sourceId,
    externalId: item.externalId,
    canonicalUrl: item.canonicalUrl,
    urlHash: item.urlHash,
    title: item.title,
    normalizedTitle: item.normalizedTitle,
    titleHash: item.titleHash,
    bodyText: item.bodyText,
    contentHash: item.contentHash,
    publishedAt: item.publishedAt,
    publishedAtInferred: item.publishedAtInferred,
    attachmentUrls: item.attachmentUrls,
    rawPayload: item.rawPayload,
    status,
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  } as const;
}

async function persistNormalizedItem(
  db: ReturnType<typeof createWorkerDatabase>["db"],
  sourceId: string,
  sourceTier: number,
  defaultCardType: SourceAdapter["defaultCardType"],
  item: NormalizedSourceItem,
) {
  return db.transaction(async (tx) => {
    const assessCard = async (cardId: string) => {
      const evaluatedAt = new Date();
      const assessment = assessInformationValue({
        sourceTier,
        publishedAt: item.publishedAt,
        evaluatedAt,
        hasDuplicateCandidates: false,
      });

      await tx
        .insert(informationValueRuleVersions)
        .values({
          version: INFORMATION_VALUE_RULE_VERSION,
          weights: INFORMATION_VALUE_WEIGHTS,
          active: true,
        })
        .onConflictDoNothing({ target: informationValueRuleVersions.version });

      await tx
        .insert(cardValueAssessments)
        .values({
          cardId,
          ruleVersion: INFORMATION_VALUE_RULE_VERSION,
          score: assessment.score,
          breakdown: assessment.breakdown,
          reason: assessment.reason,
          badge: assessment.badge,
          evaluatedAt,
        })
        .onConflictDoUpdate({
          target: [
            cardValueAssessments.cardId,
            cardValueAssessments.ruleVersion,
          ],
          set: {
            score: assessment.score,
            breakdown: assessment.breakdown,
            reason: assessment.reason,
            badge: assessment.badge,
            evaluatedAt,
          },
        });

      await tx
        .update(cards)
        .set({
          informationValueScore: assessment.score,
          informationValueReason: assessment.reason,
          informationValueBadge: assessment.badge,
          informationValueRuleVersion: INFORMATION_VALUE_RULE_VERSION,
          informationValueAssessedAt: evaluatedAt,
          updatedAt: evaluatedAt,
        })
        .where(eq(cards.id, cardId));
    };

    const [existing] = await tx
      .select({
        id: sourceItems.id,
        contentHash: sourceItems.contentHash,
        status: sourceItems.status,
        cardId: cards.id,
      })
      .from(sourceItems)
      .leftJoin(cards, eq(cards.primarySourceItemId, sourceItems.id))
      .where(itemIdentity(item, sourceId))
      .limit(1);

    if (existing) {
      const changed = existing.contentHash !== item.contentHash;
      await tx
        .update(sourceItems)
        .set(sourceItemValues(item, sourceId, "carded"))
        .where(eq(sourceItems.id, existing.id));

      if (existing.status !== "carded") {
        const [card] = await tx
          .insert(cards)
          .values({
            title: item.title,
            summary: makeSummary(item),
            type: defaultCardType,
            primarySourceItemId: existing.id,
            publishedAt: item.publishedAt,
            reviewStatus: "pending_review",
            dedupeStatus: "unique",
            bodyTruncated: item.bodyTruncated,
          })
          .returning({ id: cards.id });
        if (!card) throw new Error("Failed to create card for recovered source item.");

        await tx.insert(cardSources).values({
          cardId: card.id,
          sourceItemId: existing.id,
          isPrimary: true,
        });
        await assessCard(card.id);
        return "created";
      }

      if (changed) {
        const [updatedCard] = await tx
          .update(cards)
          .set({
            title: item.title,
            summary: makeSummary(item),
            publishedAt: item.publishedAt,
            bodyTruncated: item.bodyTruncated,
            updatedAt: new Date(),
          })
          .where(eq(cards.primarySourceItemId, existing.id))
          .returning({ id: cards.id });
        if (updatedCard) await assessCard(updatedCard.id);
      } else if (existing.cardId) {
        await assessCard(existing.cardId);
      }

      return changed ? "updated" : "duplicate";
    }

    const [createdItem] = await tx
      .insert(sourceItems)
      .values(sourceItemValues(item, sourceId, "normalized"))
      .returning({ id: sourceItems.id });
    if (!createdItem) throw new Error("Failed to create source item.");

    const [card] = await tx
      .insert(cards)
      .values({
        title: item.title,
        summary: makeSummary(item),
        type: defaultCardType,
        primarySourceItemId: createdItem.id,
        publishedAt: item.publishedAt,
        reviewStatus: "pending_review",
        dedupeStatus: "unique",
        bodyTruncated: item.bodyTruncated,
      })
      .returning({ id: cards.id });
    if (!card) throw new Error("Failed to create card.");

    await tx.insert(cardSources).values({
      cardId: card.id,
      sourceItemId: createdItem.id,
      isPrimary: true,
    });
    await assessCard(card.id);
    await tx
      .update(sourceItems)
      .set({ status: "carded", updatedAt: new Date() })
      .where(eq(sourceItems.id, createdItem.id));

    return "created";
  });
}

async function recordNormalizationFailure(options: {
  db: ReturnType<typeof createWorkerDatabase>["db"];
  sourceId: string;
  runId: string;
  raw: RawSourceItem;
  attemptNo: number;
  error: unknown;
}) {
  const details = safeError(options.error);
  const externalId = options.raw.externalId?.trim() || null;
  let item: { id: string } | undefined;

  if (externalId) {
    [item] = await options.db
      .select({ id: sourceItems.id })
      .from(sourceItems)
      .where(
        and(
          eq(sourceItems.sourceId, options.sourceId),
          eq(sourceItems.externalId, externalId),
        ),
      )
      .limit(1);
  }

  if (item) {
    await options.db
      .update(sourceItems)
      .set({
        canonicalUrl: options.raw.url || null,
        title: options.raw.title || null,
        rawPayload: options.raw.payload,
        status: "parse_failed",
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sourceItems.id, item.id));
  } else {
    [item] = await options.db
      .insert(sourceItems)
      .values({
        sourceId: options.sourceId,
        externalId,
        canonicalUrl: options.raw.url || null,
        title: options.raw.title || null,
        rawPayload: options.raw.payload,
        status: "parse_failed",
      })
      .returning({ id: sourceItems.id });
  }

  await options.db.insert(processingAttempts).values({
    runId: options.runId,
    sourceItemId: item?.id,
    stage: "normalize",
    status: "failed",
    attemptNo: options.attemptNo,
    errorType: details.type,
    errorMessage: details.message,
  });
}

async function recordProcessingFailure(options: {
  db: ReturnType<typeof createWorkerDatabase>["db"];
  runId: string;
  stage: "dedupe" | "card";
  attemptNo: number;
  error: unknown;
}) {
  const details = safeError(options.error);
  await options.db.insert(processingAttempts).values({
    runId: options.runId,
    stage: options.stage,
    status: "failed",
    attemptNo: options.attemptNo,
    errorType: details.type,
    errorMessage: details.message,
  });
}

export async function runPersistentIngestion(
  adapter: SourceAdapter,
  cursor?: string,
): Promise<RunCounts> {
  const worker = createWorkerDatabase();
  const counts: RunCounts = {
    fetched: 0,
    created: 0,
    updated: 0,
    duplicate: 0,
    failed: 0,
  };

  try {
    const [source] = await worker.db
      .insert(sources)
      .values(sourceDefinition(adapter))
      .onConflictDoUpdate({
        target: sources.key,
        set: {
          name: adapter.name,
          defaultCardType: adapter.defaultCardType,
          enabled: true,
        },
      })
      .returning({ id: sources.id });
    if (!source) throw new Error("Failed to register ingestion source.");

    let run: { id: string };
    try {
      const [createdRun] = await worker.db
        .insert(ingestionRuns)
        .values({ sourceId: source.id, cursor })
        .returning({ id: ingestionRuns.id });
      if (!createdRun) throw new Error("Failed to create ingestion run.");
      run = createdRun;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("ingestion_runs_one_running_per_source")
      ) {
        throw new Error(`Source "${adapter.key}" already has a running ingestion.`);
      }
      throw error;
    }

    try {
      const rawItems = await adapter.fetch(cursor);
      counts.fetched = rawItems.length;

      for (const [index, raw] of rawItems.entries()) {
        let normalized: NormalizedSourceItem;
        try {
          normalized = normalizeItem(raw);
        } catch (error) {
          counts.failed += 1;
          await recordNormalizationFailure({
            db: worker.db,
            sourceId: source.id,
            runId: run.id,
            raw,
            attemptNo: index + 1,
            error,
          });
          continue;
        }

        try {
          const result = await persistNormalizedItem(
            worker.db,
            source.id,
            adapter.key === "kstartup" ? 1 : 2,
            adapter.defaultCardType,
            normalized,
          );
          counts[result] += 1;
        } catch (error) {
          counts.failed += 1;
          await recordProcessingFailure({
            db: worker.db,
            runId: run.id,
            stage: "card",
            attemptNo: index + 1,
            error,
          });
        }
      }

      await worker.db
        .update(ingestionRuns)
        .set({
          finishedAt: new Date(),
          status: counts.failed > 0 ? "partial" : "success",
          fetchedCount: counts.fetched,
          newCount: counts.created,
          updatedCount: counts.updated,
          duplicateCount: counts.duplicate,
          failedCount: counts.failed,
          cursor,
        })
        .where(eq(ingestionRuns.id, run.id));
    } catch (error) {
      const details = safeError(error);
      await worker.db
        .update(ingestionRuns)
        .set({
          finishedAt: new Date(),
          status: "failed",
          errorType: details.type,
          errorMessage: details.message,
        })
        .where(eq(ingestionRuns.id, run.id));
      throw error;
    }

    return counts;
  } finally {
    await worker.close();
  }
}
