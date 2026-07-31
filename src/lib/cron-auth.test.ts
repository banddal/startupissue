import { describe, expect, it } from "vitest";

import { isCronAuthorized } from "./cron-auth";

describe("cron authorization", () => {
  it("accepts only the configured bearer secret", () => {
    expect(isCronAuthorized("Bearer secret", "secret")).toBe(true);
    expect(isCronAuthorized("Bearer wrong", "secret")).toBe(false);
    expect(isCronAuthorized(null, "secret")).toBe(false);
  });

  it("fails closed when CRON_SECRET is missing", () => {
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
