import {
  indicatorChange,
  indicatorPeriodBounds,
  previousIndicatorPeriod,
} from "./indicator-period";

export function monthlyIndicatorPeriod(at: Date) {
  return `${at.getUTCFullYear()}M${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyCountSnapshot(input: {
  at: Date;
  count: number;
  previousValue: number | null;
}) {
  const period = monthlyIndicatorPeriod(input.at);
  const bounds = indicatorPeriodBounds({
    cadence: "monthly",
    year: input.at.getUTCFullYear(),
    month: input.at.getUTCMonth() + 1,
  });

  return {
    period,
    previousPeriod: previousIndicatorPeriod(period),
    periodStart: bounds.start,
    periodEnd: bounds.end,
    value: input.count,
    previousValue: input.previousValue,
    changeValue: indicatorChange(input.count, input.previousValue),
  };
}

export function buildCompanyCountSnapshot(input: {
  at: Date;
  approvedCount: number;
  previousValue: number | null;
}) {
  return buildMonthlyCountSnapshot({
    at: input.at,
    count: input.approvedCount,
    previousValue: input.previousValue,
  });
}
