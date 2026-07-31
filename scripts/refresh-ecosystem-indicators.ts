import dotenv from "dotenv";
import { and, count, eq, sql } from "drizzle-orm";

import { buildCompanyCountSnapshot } from "../src/lib/indicator-snapshot";
import {
  companies,
  indicators,
  indicatorValues,
} from "../src/server/db/schema";
import { createWorkerDatabase } from "../worker/db";

dotenv.config({ path: ".env.local", quiet: true });

const COMPANY_COUNT_CODE = "ecosystem_company_count";

function parseObservationDate(args: string[]) {
  const value = args.find((arg) => arg.startsWith("--at="))?.slice(5);
  if (!value) return new Date();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --at date: ${value}`);
  }
  return parsed;
}

async function main() {
  const observedAt = parseObservationDate(process.argv.slice(2));
  const worker = createWorkerDatabase();

  try {
    const [indicator] = await worker.db
      .select({ id: indicators.id })
      .from(indicators)
      .where(
        and(
          eq(indicators.code, COMPANY_COUNT_CODE),
          eq(indicators.active, true),
        ),
      )
      .limit(1);

    if (!indicator) {
      throw new Error(`Active indicator not found: ${COMPANY_COUNT_CODE}`);
    }

    const approvedBySector = await worker.db
      .select({
        sectorKey: companies.sectorKey,
        value: count(),
      })
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
    const [previous] = await worker.db
      .select({ value: indicatorValues.value })
      .from(indicatorValues)
      .where(
        and(
          eq(indicatorValues.indicatorId, indicator.id),
          eq(indicatorValues.period, provisional.previousPeriod),
        ),
      )
      .limit(1);
    const previousValue =
      previous?.value === null || previous?.value === undefined
        ? null
        : Number(previous.value);
    const snapshot = buildCompanyCountSnapshot({
      at: observedAt,
      approvedCount,
      previousValue,
    });
    const values = {
      indicatorId: indicator.id,
      period: snapshot.period,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      value: String(snapshot.value),
      previousValue:
        snapshot.previousValue === null ? null : String(snapshot.previousValue),
      changeValue:
        snapshot.changeValue === null ? null : String(snapshot.changeValue),
      status: "available" as const,
      sourceLabel: "승인 기업 명부",
      sourceUrl: "/admin/companies",
      observedAt,
      collectedAt: new Date(),
      metadata: {
        calculation: "approved_company_count",
        sectors: approvedBySector,
      },
      updatedAt: new Date(),
    };

    await worker.db
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

    console.log(
      JSON.stringify(
        {
          indicator: COMPANY_COUNT_CODE,
          period: snapshot.period,
          value: snapshot.value,
          previousValue: snapshot.previousValue,
          changeValue: snapshot.changeValue,
          sectors: approvedBySector,
        },
        null,
        2,
      ),
    );
  } finally {
    await worker.close();
  }
}

void main();
