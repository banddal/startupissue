import { eq, isNull } from "drizzle-orm";
import dotenv from "dotenv";

import {
  cards,
  cardValueAssessments,
  informationValueRuleVersions,
  sourceItems,
  sources,
} from "../src/server/db/schema";
import {
  assessInformationValue,
  INFORMATION_VALUE_RULE_VERSION,
  INFORMATION_VALUE_WEIGHTS,
} from "../worker/core/information-value";
import { createWorkerDatabase } from "../worker/db";

async function main() {
  dotenv.config({ path: ".env.local", quiet: true });
  dotenv.config({ path: ".env", quiet: true });
  const worker = createWorkerDatabase();
  try {
  const pendingCards = await worker.db
    .select({
      id: cards.id,
      publishedAt: cards.publishedAt,
      dedupeStatus: cards.dedupeStatus,
      sourceTier: sources.tier,
    })
    .from(cards)
    .innerJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
    .innerJoin(sources, eq(sources.id, sourceItems.sourceId))
    .where(isNull(cards.informationValueScore));

  await worker.db
    .insert(informationValueRuleVersions)
    .values({
      version: INFORMATION_VALUE_RULE_VERSION,
      weights: INFORMATION_VALUE_WEIGHTS,
      active: true,
    })
    .onConflictDoNothing({ target: informationValueRuleVersions.version });

  const evaluatedAt = new Date();
  for (const card of pendingCards) {
    const assessment = assessInformationValue({
      sourceTier: card.sourceTier,
      publishedAt: card.publishedAt,
      evaluatedAt,
      hasDuplicateCandidates: card.dedupeStatus === "has_candidates",
    });

    await worker.db.transaction(async (tx) => {
      await tx
        .insert(cardValueAssessments)
        .values({
          cardId: card.id,
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
        .where(eq(cards.id, card.id));
    });
  }

    console.log(
      JSON.stringify({
        ruleVersion: INFORMATION_VALUE_RULE_VERSION,
        assessed: pendingCards.length,
      }),
    );
  } finally {
    await worker.close();
  }
}

void main();
