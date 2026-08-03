import { and, eq } from "drizzle-orm";

import {
  cards,
  cardSources,
  ingestionRuns,
  processingAttempts,
  sourceItems,
  sources,
} from "../src/server/db/schema";
import { makeSummary, normalizeItem } from "./core/normalize";
import { classifyCardType } from "./core/card-classification";
import { shouldHideFromMainTimeline } from "./core/card-visibility";
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
    kind: (adapter.key === "kstartup" ? "api" : "rss") as "rss" | "api",
    tier: adapter.key === "kstartup" || adapter.key === "etnews-ai" ? 1 : 2,
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
  defaultCardType: SourceAdapter["defaultCardType"],
  item: NormalizedSourceItem,
  sourceKey: string,
) {
  const cardType = classifyCardType({
    sourceKey,
    defaultCardType,
    title: item.title,
  });
  const reviewStatus = shouldHideFromMainTimeline(item.title)
    ? "hidden"
    : "pending_review";
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: sourceItems.id,
        contentHash: sourceItems.contentHash,
        status: sourceItems.status,
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
            type: cardType,
            primarySourceItemId: existing.id,
            publishedAt: item.publishedAt,
            reviewStatus,
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
        return "created";
      }

      if (changed) {
        await tx
          .update(cards)
          .set({
            title: item.title,
            summary: makeSummary(item),
            publishedAt: item.publishedAt,
            bodyTruncated: item.bodyTruncated,
            updatedAt: new Date(),
          })
          .where(eq(cards.primarySourceItemId, existing.id));
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
        type: cardType,
        primarySourceItemId: createdItem.id,
        publishedAt: item.publishedAt,
        reviewStatus,
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
            adapter.defaultCardType,
            normalized,
            adapter.key,
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
