import dotenv from "dotenv";
import { and, count, eq, sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  buildCompanyCountSnapshot,
  buildMonthlyCountSnapshot,
} from "../src/lib/indicator-snapshot";
import {
  companies,
  indicators,
  indicatorValues,
} from "../src/server/db/schema";
import { createWorkerDatabase } from "../worker/db";
import {
  DEFAULT_ARXIV_SEARCH_QUERY,
  fetchArxivWorkCount,
} from "../worker/indicators/arxiv";
import { fetchOpenAlexWorkCount } from "../worker/indicators/openalex";

dotenv.config({ path: ".env.local", quiet: true });

const COMPANY_COUNT_CODE = "ecosystem_company_count";
const NEW_PAPERS_CODE = "ecosystem_new_papers";

type WorkerDatabase = ReturnType<typeof createWorkerDatabase>;
type Database = WorkerDatabase["db"];

function parseObservationDate(args: string[]) {
  const value = args.find((arg) => arg.startsWith("--at="))?.slice(5);
  if (!value) return new Date();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --at date: ${value}`);
  }
  return parsed;
}

async function activeIndicator(db: Database, code: string) {
  const [indicator] = await db
    .select({ id: indicators.id })
    .from(indicators)
    .where(and(eq(indicators.code, code), eq(indicators.active, true)))
    .limit(1);

  if (!indicator) throw new Error(`Active indicator not found: ${code}`);
  return indicator;
}

async function previousIndicatorValue(
  db: Database,
  indicatorId: string,
  previousPeriod: string,
) {
  const [previous] = await db
    .select({ value: indicatorValues.value })
    .from(indicatorValues)
    .where(
      and(
        eq(indicatorValues.indicatorId, indicatorId),
        eq(indicatorValues.period, previousPeriod),
      ),
    )
    .limit(1);

  return previous?.value === null || previous?.value === undefined
    ? null
    : Number(previous.value);
}

async function upsertMonthlyCount(
  db: Database,
  input: {
    indicatorId: string;
    snapshot: ReturnType<typeof buildMonthlyCountSnapshot>;
    observedAt: Date;
    sourceLabel: string;
    sourceUrl: string;
    metadata: Record<string, unknown>;
  },
) {
  const values = {
    indicatorId: input.indicatorId,
    period: input.snapshot.period,
    periodStart: input.snapshot.periodStart,
    periodEnd: input.snapshot.periodEnd,
    value: String(input.snapshot.value),
    previousValue:
      input.snapshot.previousValue === null
        ? null
        : String(input.snapshot.previousValue),
    changeValue:
      input.snapshot.changeValue === null
        ? null
        : String(input.snapshot.changeValue),
    status: "available" as const,
    sourceLabel: input.sourceLabel,
    sourceUrl: input.sourceUrl,
    observedAt: input.observedAt,
    collectedAt: new Date(),
    metadata: input.metadata,
    updatedAt: new Date(),
  };

  await db
    .insert(indicatorValues)
    .values(values)
    .onConflictDoUpdate({
      target: [indicatorValues.indicatorId, indicatorValues.period],
      set: {
        ...values,
        collectedAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    });
}

async function refreshCompanyCount(db: Database, observedAt: Date) {
  const indicator = await activeIndicator(db, COMPANY_COUNT_CODE);
  const approvedBySector = await db
    .select({ sectorKey: companies.sectorKey, value: count() })
    .from(companies)
    .where(eq(companies.status, "approved"))
    .groupBy(companies.sectorKey)
    .orderBy(companies.sectorKey);
  const approvedCount = approvedBySector.reduce(
    (sum, sector) => sum + sector.value,
    0,
  );
  const provisional = buildCompanyCountSnapshot({
    at: observedAt,
    approvedCount,
    previousValue: null,
  });
  const previousValue = await previousIndicatorValue(
    db,
    indicator.id,
    provisional.previousPeriod,
  );
  const snapshot = buildCompanyCountSnapshot({
    at: observedAt,
    approvedCount,
    previousValue,
  });

  await upsertMonthlyCount(db, {
    indicatorId: indicator.id,
    snapshot,
    observedAt,
    sourceLabel: "승인 기업 명부",
    sourceUrl: "/admin/companies",
    metadata: {
      calculation: "approved_company_count",
      sectors: approvedBySector,
    },
  });

  return {
    indicator: COMPANY_COUNT_CODE,
    period: snapshot.period,
    value: snapshot.value,
    previousValue: snapshot.previousValue,
    changeValue: snapshot.changeValue,
    sectors: approvedBySector,
  };
}

async function refreshNewPapers(db: Database, observedAt: Date) {
  const indicator = await activeIndicator(db, NEW_PAPERS_CODE);
  const provisional = buildMonthlyCountSnapshot({
    at: observedAt,
    count: 0,
    previousValue: null,
  });
  const openAlexConfigured = Boolean(
    process.env.OPENALEX_API_KEY?.trim() &&
      process.env.OPENALEX_SEARCH_QUERY?.trim(),
  );
  const provider = openAlexConfigured ? "OpenAlex" : "arXiv";
  const query = openAlexConfigured
    ? process.env.OPENALEX_SEARCH_QUERY!
    : (process.env.ARXIV_SEARCH_QUERY?.trim() ||
      DEFAULT_ARXIV_SEARCH_QUERY);
  const result = openAlexConfigured
    ? await fetchOpenAlexWorkCount({
        apiKey: process.env.OPENALEX_API_KEY!,
        query,
        periodStart: provisional.periodStart,
        periodEnd: provisional.periodEnd,
      })
    : await fetchArxivWorkCount({
        query,
        periodStart: provisional.periodStart,
        periodEnd: provisional.periodEnd,
      });
  const previousValue = await previousIndicatorValue(
    db,
    indicator.id,
    provisional.previousPeriod,
  );
  const snapshot = buildMonthlyCountSnapshot({
    at: observedAt,
    count: result.count,
    previousValue,
  });

  await upsertMonthlyCount(db, {
    indicatorId: indicator.id,
    snapshot,
    observedAt,
    sourceLabel: provider,
    sourceUrl: result.requestUrl,
    metadata: {
      calculation:
        provider === "OpenAlex"
          ? "openalex_search_count"
          : "arxiv_search_count",
      provider,
      query,
      dateField:
        provider === "OpenAlex" ? "publication_date" : "submittedDate",
    },
  });

  return {
    indicator: NEW_PAPERS_CODE,
    period: snapshot.period,
    value: snapshot.value,
    previousValue: snapshot.previousValue,
    changeValue: snapshot.changeValue,
    provider,
  };
}

export async function refreshEcosystemIndicators(observedAt = new Date()) {
  const worker = createWorkerDatabase();
  const results: Array<Record<string, unknown>> = [];
  const errors: Array<{ indicator: string; message: string }> = [];
  const jobs = [
    { code: COMPANY_COUNT_CODE, run: refreshCompanyCount },
    { code: NEW_PAPERS_CODE, run: refreshNewPapers },
  ];

  try {
    for (const job of jobs) {
      try {
        results.push(await job.run(worker.db, observedAt));
      } catch (error) {
        errors.push({
          indicator: job.code,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  } finally {
    await worker.close();
  }

  return { results, errors };
}

async function main() {
  const observedAt = parseObservationDate(process.argv.slice(2));
  const output = await refreshEcosystemIndicators(observedAt);
  console.log(JSON.stringify(output, null, 2));
  if (output.errors.length > 0) process.exitCode = 1;
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  void main();
}
