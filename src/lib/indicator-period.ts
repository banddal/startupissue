export type IndicatorPeriod =
  | { cadence: "monthly"; year: number; month: number }
  | { cadence: "quarterly"; year: number; quarter: number }
  | { cadence: "annual"; year: number };

export function parseIndicatorPeriod(value: string): IndicatorPeriod {
  const annual = /^(\d{4})$/.exec(value);
  if (annual) return { cadence: "annual", year: Number(annual[1]) };

  const monthly = /^(\d{4})M(0[1-9]|1[0-2])$/.exec(value);
  if (monthly) {
    return {
      cadence: "monthly",
      year: Number(monthly[1]),
      month: Number(monthly[2]),
    };
  }

  const quarterly = /^(\d{4})Q([1-4])$/.exec(value);
  if (quarterly) {
    return {
      cadence: "quarterly",
      year: Number(quarterly[1]),
      quarter: Number(quarterly[2]),
    };
  }

  throw new Error(`Invalid indicator period: ${value}`);
}

export function indicatorPeriodBounds(period: IndicatorPeriod) {
  if (period.cadence === "annual") {
    return {
      start: new Date(Date.UTC(period.year, 0, 1)),
      end: new Date(Date.UTC(period.year, 11, 31)),
    };
  }

  const startMonth =
    period.cadence === "monthly"
      ? period.month - 1
      : (period.quarter - 1) * 3;
  const monthCount = period.cadence === "monthly" ? 1 : 3;

  return {
    start: new Date(Date.UTC(period.year, startMonth, 1)),
    end: new Date(Date.UTC(period.year, startMonth + monthCount, 0)),
  };
}

export function previousIndicatorPeriod(value: string) {
  const period = parseIndicatorPeriod(value);
  if (period.cadence === "annual") return String(period.year - 1);
  if (period.cadence === "monthly") {
    const date = new Date(Date.UTC(period.year, period.month - 2, 1));
    return `${date.getUTCFullYear()}M${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  return period.quarter === 1
    ? `${period.year - 1}Q4`
    : `${period.year}Q${period.quarter - 1}`;
}

export function indicatorChange(
  current: number,
  previous: number | null,
): number | null {
  return previous === null ? null : current - previous;
}
