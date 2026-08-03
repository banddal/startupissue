import { and, eq, inArray, isNull } from "drizzle-orm";
import { config } from "dotenv";

import { cards } from "../src/server/db/schema";
import { shouldHideFromMainTimeline } from "../worker/core/card-visibility";
import { createWorkerDatabase } from "../worker/db";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const { db, close } = createWorkerDatabase();
  try {
    const candidates = await db
      .select({ id: cards.id, title: cards.title })
      .from(cards)
      .where(
        and(
          inArray(cards.reviewStatus, ["auto", "pending_review"]),
          eq(cards.important, false),
          isNull(cards.note),
        ),
      );
    const hidden = candidates.filter((card) => shouldHideFromMainTimeline(card.title));
    if (hidden.length > 0) {
      await db
        .update(cards)
        .set({ reviewStatus: "hidden", updatedAt: new Date() })
        .where(inArray(cards.id, hidden.map((card) => card.id)));
    }
    console.log(
      JSON.stringify(
        { scanned: candidates.length, hidden: hidden.length, titles: hidden.map((card) => card.title) },
        null,
        2,
      ),
    );
  } finally {
    await close();
  }
}

void main();
