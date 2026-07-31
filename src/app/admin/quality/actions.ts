"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CARD_QUALITY_VERDICTS } from "@/lib/card-quality";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { cardQualityReviews } from "@/server/db/schema";

const reviewSchema = z.object({
  cardId: z.string().uuid(),
  verdict: z.enum(CARD_QUALITY_VERDICTS),
  note: z.string().trim().max(2_000),
  scoreSnapshot: z.coerce.number().int().nullable(),
  ruleVersion: z.string().trim().max(100),
});

export async function reviewCardQuality(formData: FormData) {
  const admin = await requireAdmin();
  const scoreValue = formData.get("scoreSnapshot");
  const input = reviewSchema.parse({
    cardId: formData.get("cardId"),
    verdict: formData.get("verdict"),
    note: formData.get("note") ?? "",
    scoreSnapshot:
      typeof scoreValue === "string" && scoreValue !== "" ? scoreValue : null,
    ruleVersion: formData.get("ruleVersion") ?? "",
  });
  const now = new Date();

  await db
    .insert(cardQualityReviews)
    .values({
      cardId: input.cardId,
      reviewerId: admin.id,
      verdict: input.verdict,
      note: input.note || null,
      scoreSnapshot: input.scoreSnapshot,
      ruleVersion: input.ruleVersion || null,
      reviewedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        cardQualityReviews.cardId,
        cardQualityReviews.reviewerId,
      ],
      set: {
        verdict: input.verdict,
        note: input.note || null,
        scoreSnapshot: input.scoreSnapshot,
        ruleVersion: input.ruleVersion || null,
        reviewedAt: now,
        updatedAt: now,
      },
    });

  revalidatePath("/admin/quality");
}
