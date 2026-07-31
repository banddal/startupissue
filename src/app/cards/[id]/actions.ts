"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CARD_TYPES } from "@/lib/card-types";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { cards } from "@/server/db/schema";

const inputSchema = z.object({
  cardId: z.string().uuid(),
  type: z.enum(CARD_TYPES),
});

export async function updateCardType(formData: FormData) {
  await requireAdmin();
  const input = inputSchema.parse({
    cardId: formData.get("cardId"),
    type: formData.get("type"),
  });

  await db
    .update(cards)
    .set({ type: input.type, updatedAt: new Date() })
    .where(eq(cards.id, input.cardId));

  revalidatePath("/today");
  revalidatePath("/cards");
  revalidatePath(`/cards/${input.cardId}`);
}
