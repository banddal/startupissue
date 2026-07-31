import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local", quiet: true });

const sql = neon(process.env.DATABASE_URL);
const [cards, assessments, badges, recentRuns] = await Promise.all([
  sql`select count(*)::int as count from cards
      where merged_into_card_id is null and review_status != 'hidden'`,
  sql`select count(*)::int as count from card_value_assessments`,
  sql`select information_value_badge as badge, count(*)::int as count
      from cards
      where information_value_score is not null
      group by information_value_badge
      order by information_value_badge`,
  sql`select status, failed_count, finished_at
      from ingestion_runs
      order by started_at desc
      limit 2`,
]);

console.log(
  JSON.stringify(
    {
      visibleCards: cards[0]?.count ?? 0,
      assessments: assessments[0]?.count ?? 0,
      badges,
      recentRuns,
    },
    null,
    2,
  ),
);
