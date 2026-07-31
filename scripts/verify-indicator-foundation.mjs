import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local", quiet: true });

const sql = neon(process.env.DATABASE_URL);
const [definitions, values, indexes] = await Promise.all([
  sql`select code, name, unit, cadence, active
      from indicators
      order by display_order`,
  sql`select count(*)::int as count from indicator_values`,
  sql`select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname = 'indicator_values_indicator_period_unique'`,
]);

console.log(JSON.stringify({ definitions, values: values[0], indexes }, null, 2));
