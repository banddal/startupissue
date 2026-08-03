"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { cards, notes } from "@/server/db/schema";

const inputSchema = z.object({
  cardId: z.string().uuid(),
  body: z.string().max(5_000),
});

export async function saveCardNote(cardIdValue: string, formData: FormData) {
  const input = inputSchema.parse({
    cardId: cardIdValue,
    body: formData.get("body"),
  });
  const body = input.body.trim();
  const user = await requireUser();
  const [card] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.id, input.cardId))
    .limit(1);
  if (!card) throw new Error("Card not found.");

  if (body) {
    await db
      .insert(notes)
      .values({ userId: user.id, cardId: input.cardId, body })
      .onConflictDoUpdate({
        target: [notes.userId, notes.cardId],
        set: { body, updatedAt: new Date() },
      });
  } else {
    await db
      .delete(notes)
      .where(and(eq(notes.userId, user.id), eq(notes.cardId, input.cardId)));
  }

  revalidatePath("/today");
  revalidatePath("/cards");
  revalidatePath(`/cards/${input.cardId}`);
}
