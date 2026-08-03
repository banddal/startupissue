"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { notes } from "@/server/db/schema";

const inputSchema = z.object({
  cardId: z.string().uuid(),
  body: z.string().max(5_000),
});

export async function saveCardNote(cardIdValue: string, formData: FormData) {
  const user = await requireActiveUser();
  const input = inputSchema.parse({
    cardId: cardIdValue,
    body: formData.get("body"),
  });
  const body = input.body.trim();

  if (!body) {
    await db
      .delete(notes)
      .where(and(eq(notes.userId, user.id), eq(notes.cardId, input.cardId)));
  } else {
    await db
      .insert(notes)
      .values({ userId: user.id, cardId: input.cardId, body })
      .onConflictDoUpdate({
        target: [notes.userId, notes.cardId],
        set: { body, updatedAt: new Date() },
      });
  }

  revalidatePath("/today");
  revalidatePath("/cards");
  revalidatePath(`/cards/${input.cardId}`);
}
