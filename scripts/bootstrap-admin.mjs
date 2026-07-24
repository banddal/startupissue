import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;

if (!databaseUrl || !email) {
  throw new Error("DATABASE_URL and BOOTSTRAP_ADMIN_EMAIL are required.");
}

const sql = neon(databaseUrl);
const result = await sql`
  update users
  set role = 'admin',
      status = 'active',
      approved_at = now(),
      updated_at = now()
  where lower(email) = lower(${email})
  returning id, email, role, status
`;

if (result.length !== 1) {
  throw new Error("Expected exactly one matching user. Sign in once before bootstrapping admin.");
}

console.log(result[0]);
