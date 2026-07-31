import { describe, expect, it } from "vitest";

import { normalizeCompanyName, parseCompanyAliases } from "./companies";

describe("company helpers", () => {
  it("normalizes legal suffixes and whitespace for duplicate checks", () => {
    expect(normalizeCompanyName("  주식회사   스타트업 이슈 ")).toBe(
      "스타트업 이슈",
    );
    expect(normalizeCompanyName("(주)스타트업 이슈")).toBe("스타트업 이슈");
  });

  it("parses unique non-empty aliases", () => {
    expect(parseCompanyAliases("Startup Issue, 스타트업이슈, Startup Issue,"))
      .toEqual(["Startup Issue", "스타트업이슈"]);
  });
});
