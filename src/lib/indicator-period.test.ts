import { describe, expect, it } from "vitest";

import {
  indicatorChange,
  indicatorPeriodBounds,
  parseIndicatorPeriod,
  previousIndicatorPeriod,
} from "./indicator-period";

describe("indicator periods", () => {
  it("parses supported period keys", () => {
    expect(parseIndicatorPeriod("2026")).toEqual({
      cadence: "annual",
      year: 2026,
    });
    expect(parseIndicatorPeriod("2026M07")).toEqual({
      cadence: "monthly",
      year: 2026,
      month: 7,
    });
    expect(parseIndicatorPeriod("2026Q3")).toEqual({
      cadence: "quarterly",
      year: 2026,
      quarter: 3,
    });
  });

  it("rejects ambiguous and invalid keys", () => {
    expect(() => parseIndicatorPeriod("26Q3")).toThrow();
    expect(() => parseIndicatorPeriod("2026M13")).toThrow();
  });

  it("calculates inclusive UTC boundaries", () => {
    expect(indicatorPeriodBounds(parseIndicatorPeriod("2024Q1"))).toEqual({
      start: new Date("2024-01-01T00:00:00.000Z"),
      end: new Date("2024-03-31T00:00:00.000Z"),
    });
  });

  it("moves across year boundaries", () => {
    expect(previousIndicatorPeriod("2026M01")).toBe("2025M12");
    expect(previousIndicatorPeriod("2026Q1")).toBe("2025Q4");
    expect(previousIndicatorPeriod("2026")).toBe("2025");
  });

  it("distinguishes no previous value from a real zero", () => {
    expect(indicatorChange(0, null)).toBeNull();
    expect(indicatorChange(0, 3)).toBe(-3);
  });
});
