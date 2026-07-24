import "server-only";

import { z } from "zod";

const databaseUrlSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "DATABASE_URL must be a PostgreSQL connection string.",
  });

export function getDatabaseUrl() {
  return databaseUrlSchema.parse(process.env.DATABASE_URL);
}
