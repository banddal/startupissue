import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "@/server/env";
import * as schema from "./schema";

const neonClient = neon(getDatabaseUrl());

export const db = drizzle(neonClient, { schema });
