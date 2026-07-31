import { describe, expect, it } from "vitest";

import { qualityRate } from "./card-quality";

describe("qualityRate", () => {
  it("excludes unsure reviews from the denominator", () => {
    expect(qualityRate(["valuable", "not_valuable", "unsure"])).toBe(0.5);
  });

  it("returns null until a review is decided", () => {
    expect(qualityRate([])).toBeNull();
    expect(qualityRate(["unsure"])).toBeNull();
  });
});
