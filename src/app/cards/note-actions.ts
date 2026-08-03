"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { cards } from "@/server/db/schema";

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

  await db
    .update(cards)
    .set({ note: body || null, updatedAt: new Date() })
    .where(eq(cards.id, input.cardId));

  revalidatePath("/today");
  revalidatePath("/cards");
  revalidatePath(`/cards/${input.cardId}`);
}
