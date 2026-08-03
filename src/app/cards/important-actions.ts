"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { cards } from "@/server/db/schema";

const cardIdSchema = z.string().uuid();

export async function toggleCardImportant(cardIdValue: string) {
  const cardId = cardIdSchema.parse(cardIdValue);
  const [current] = await db
    .select({ important: cards.important })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!current) throw new Error("Card not found.");
  const important = !(current?.important ?? false);

  await db
    .update(cards)
    .set({ important, updatedAt: new Date() })
    .where(eq(cards.id, cardId));

  revalidatePath("/today");
  revalidatePath("/cards");
  revalidatePath(`/cards/${cardId}`);
}
