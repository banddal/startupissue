import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local", quiet: true });

const sql = neon(process.env.DATABASE_URL);
const [table, indexes, reviews] = await Promise.all([
  sql`select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'card_quality_reviews'`,
  sql`select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'card_quality_reviews_card_reviewer_unique',
          'card_quality_reviews_verdict_idx'
        )
      order by indexname`,
  sql`select verdict, count(*)::int as count
      from card_quality_reviews
      group by verdict
      order by verdict`,
]);

console.log(JSON.stringify({ table, indexes, reviews }, null, 2));
