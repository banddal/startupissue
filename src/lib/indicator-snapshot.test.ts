import { describe, expect, it } from "vitest";

import {
  buildCompanyCountSnapshot,
  monthlyIndicatorPeriod,
} from "./indicator-snapshot";

describe("company count indicator snapshot", () => {
  it("builds a monthly snapshot with the previous-period change", () => {
    expect(
      buildCompanyCountSnapshot({
        at: new Date("2026-08-15T03:00:00.000Z"),
        approvedCount: 12,
        previousValue: 9,
      }),
    ).toEqual({
      period: "2026M08",
      previousPeriod: "2026M07",
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-31T00:00:00.000Z"),
      value: 12,
      previousValue: 9,
      changeValue: 3,
    });
  });

  it("keeps a first observation distinct from zero change", () => {
    const snapshot = buildCompanyCountSnapshot({
      at: new Date("2026-01-01T00:00:00.000Z"),
      approvedCount: 0,
      previousValue: null,
    });

    expect(monthlyIndicatorPeriod(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026M01",
    );
    expect(snapshot.previousPeriod).toBe("2025M12");
    expect(snapshot.value).toBe(0);
    expect(snapshot.changeValue).toBeNull();
  });
});
