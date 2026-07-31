import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local", quiet: true });

const sql = neon(process.env.DATABASE_URL);
const [tables, companies, constraints] = await Promise.all([
  sql`select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('companies', 'company_verifications')
      order by table_name`,
  sql`select status, count(*)::int as count
      from companies
      group by status
      order by status`,
  sql`select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'companies_sector_normalized_name_unique',
          'companies_sector_status_idx',
          'company_verifications_evidence_unique'
        )
      order by indexname`,
]);

console.log(JSON.stringify({ tables, companies, constraints }, null, 2));
