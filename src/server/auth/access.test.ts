import { describe, expect, it } from "vitest";

import { destinationFor } from "./access";

describe("destinationFor", () => {
  it("redirects anonymous users away from protected pages", () => {
    expect(destinationFor(null, "/today")).toBe("/");
  });

  it("allows anonymous users to open the sign-in page", () => {
    expect(destinationFor(null, "/")).toBeNull();
  });

  it("allows uptime checks without authentication", () => {
    expect(destinationFor(null, "/api/health")).toBeNull();
  });

  it("keeps pending users on the pending page", () => {
    expect(
      destinationFor({ role: "member", status: "pending" }, "/pending"),
    ).toBeNull();
  });

  it("redirects pending users away from product data", () => {
    expect(
      destinationFor({ role: "member", status: "pending" }, "/today"),
    ).toBe("/pending");
  });

  it("redirects active members away from admin pages", () => {
    expect(
      destinationFor({ role: "member", status: "active" }, "/admin/users"),
    ).toBe("/today");
  });

  it("allows active admins into admin pages", () => {
    expect(
      destinationFor({ role: "admin", status: "active" }, "/admin/users"),
    ).toBeNull();
  });

  it("blocks suspended users on their next request", () => {
    expect(
      destinationFor({ role: "member", status: "suspended" }, "/today"),
    ).toBe("/pending");
  });
});
