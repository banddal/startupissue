import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../src/server/db/schema";

neonConfig.webSocketConstructor = ws;

export function createWorkerDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for persistent ingestion.");
  }

  const pool = new Pool({ connectionString });
  return {
    db: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
}
