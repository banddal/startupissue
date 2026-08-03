import dotenv from "dotenv";
import { eq } from "drizzle-orm";

import { cards, sourceItems, sources } from "../src/server/db/schema";
import { classifyCardType } from "../worker/core/card-classification";
import { createWorkerDatabase } from "../worker/db";

async function main() {
  dotenv.config({ path: ".env.local", quiet: true });
  dotenv.config({ path: ".env", quiet: true });
  const worker = createWorkerDatabase();

  try {
    const rows = await worker.db
      .select({
        id: cards.id,
        currentType: cards.type,
        title: cards.title,
        sourceKey: sources.key,
        defaultCardType: sources.defaultCardType,
      })
      .from(cards)
      .innerJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
      .innerJoin(sources, eq(sources.id, sourceItems.sourceId));

    const changes: Record<string, number> = {};
    for (const row of rows) {
      const nextType = classifyCardType({
        sourceKey: row.sourceKey,
        defaultCardType: row.defaultCardType,
        title: row.title,
      });
      if (nextType === row.currentType) continue;

      await worker.db
        .update(cards)
        .set({ type: nextType, updatedAt: new Date() })
        .where(eq(cards.id, row.id));
      const key = `${row.currentType}->${nextType}`;
      changes[key] = (changes[key] ?? 0) + 1;
    }

    console.log(JSON.stringify({ scanned: rows.length, changes }, null, 2));
  } finally {
    await worker.close();
  }
}

void main();
