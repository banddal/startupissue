import { describe, expect, it } from "vitest";

import { destinationFor } from "./access";

describe("destinationFor", () => {
  it("allows anonymous users to view the today page", () => {
    expect(destinationFor(null, "/today")).toBeNull();
  });

  it("allows anonymous users to view card pages", () => {
    expect(destinationFor(null, "/cards")).toBeNull();
    expect(destinationFor(null, "/cards/card-1")).toBeNull();
  });

  it("allows anonymous users to view research paper pages", () => {
    expect(destinationFor(null, "/papers")).toBeNull();
    expect(destinationFor(null, "/papers/paper-1")).toBeNull();
  });

  it("allows anonymous users to open the sign-in page", () => {
    expect(destinationFor(null, "/")).toBeNull();
  });

  it("allows uptime checks without authentication", () => {
    expect(destinationFor(null, "/api/health")).toBeNull();
  });

  it("lets cron routes perform their own bearer-token authorization", () => {
    expect(destinationFor(null, "/api/cron/cards")).toBeNull();
  });

  it("keeps pending users on the pending page", () => {
    expect(
      destinationFor({ role: "member", status: "pending" }, "/pending"),
    ).toBeNull();
  });

  it("allows pending users to view public product data", () => {
    expect(
      destinationFor({ role: "member", status: "pending" }, "/today"),
    ).toBeNull();
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

  it("allows suspended users to view public product data", () => {
    expect(
      destinationFor({ role: "member", status: "suspended" }, "/today"),
    ).toBeNull();
  });
});
