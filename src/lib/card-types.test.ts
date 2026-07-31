import { describe, expect, it } from "vitest";

import { CARD_TYPE_LABELS, CARD_TYPES, isCardType } from "./card-types";

describe("card information types", () => {
  it("keeps the four PRD v0.3 information axes", () => {
    expect(CARD_TYPES).toEqual([
      "company",
      "technology",
      "policy",
      "investment",
    ]);
    expect(CARD_TYPES.map((type) => CARD_TYPE_LABELS[type])).toEqual([
      "기업",
      "기술",
      "정책",
      "투자",
    ]);
  });

  it("rejects unknown filter values", () => {
    expect(isCardType("investment")).toBe(true);
    expect(isCardType("sector")).toBe(false);
    expect(isCardType(undefined)).toBe(false);
  });
});
