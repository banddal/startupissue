"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { cards, cardUserStates } from "@/server/db/schema";

const cardIdSchema = z.string().uuid();

export async function toggleCardImportant(cardIdValue: string) {
  const cardId = cardIdSchema.parse(cardIdValue);
  const user = await requireUser();
  const [card] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!card) throw new Error("Card not found.");
  const [current] = await db
    .select({ important: cardUserStates.important })
    .from(cardUserStates)
    .where(
      and(
        eq(cardUserStates.userId, user.id),
        eq(cardUserStates.cardId, cardId),
      ),
    )
    .limit(1);
  const important = !(current?.important ?? false);

  await db
    .insert(cardUserStates)
    .values({ userId: user.id, cardId, important })
    .onConflictDoUpdate({
      target: [cardUserStates.userId, cardUserStates.cardId],
      set: { important, updatedAt: new Date() },
    });

  revalidatePath("/today");
  revalidatePath("/cards");
  revalidatePath(`/cards/${cardId}`);
}
