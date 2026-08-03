import { describe, expect, it } from "vitest";

import { cardTimelineLabel, startOfTodayInSeoul } from "./card-timeline";

describe("card timeline", () => {
  it("calculates the start of a day in Seoul", () => {
    expect(startOfTodayInSeoul(new Date("2026-08-03T03:00:00Z")).toISOString())
      .toBe("2026-08-02T15:00:00.000Z");
  });

  it("distinguishes newly collected and recent cards", () => {
    const now = new Date("2026-08-03T03:00:00Z");
    expect(cardTimelineLabel(new Date("2026-08-03T01:00:00Z"), now)).toBe("새 자료");
    expect(cardTimelineLabel(new Date("2026-08-02T14:59:59Z"), now)).toBe("최근 자료");
  });
});
