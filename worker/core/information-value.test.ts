import { describe, expect, it } from "vitest";

import {
  assessInformationValue,
  INFORMATION_VALUE_RULE_VERSION,
} from "./information-value";

describe("assessInformationValue", () => {
  const evaluatedAt = new Date("2026-07-29T00:00:00.000Z");

  it("prioritizes a fresh tier-one source", () => {
    expect(
      assessInformationValue({
        sourceTier: 1,
        publishedAt: new Date("2026-07-28T12:00:00.000Z"),
        evaluatedAt,
        hasDuplicateCandidates: false,
      }),
    ).toMatchObject({
      score: 6,
      badge: "major_change",
    });
  });

  it("applies freshness decay and the duplicate penalty", () => {
    const result = assessInformationValue({
      sourceTier: 3,
      publishedAt: new Date("2026-07-24T00:00:00.000Z"),
      evaluatedAt,
      hasDuplicateCandidates: true,
    });

    expect(result.score).toBe(0);
    expect(result.badge).toBe("reference");
    expect(result.breakdown).toEqual({
      sourceTier: { score: 1, reason: "3급 소스" },
      freshness: { score: 1, reason: "발표 후 7일 이내" },
      duplicateRisk: { score: -2, reason: "중복 후보 있음" },
    });
  });

  it("keeps a stable explicit rule version", () => {
    expect(INFORMATION_VALUE_RULE_VERSION).toBe("2026-07-v1");
  });
});
