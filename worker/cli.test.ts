import { describe, expect, it } from "vitest";

import { parseArgs } from "./cli";

describe("worker CLI", () => {
  it("parses one source in dry-run mode", () => {
    expect(parseArgs(["ingest", "--source=platum", "--dry-run"])).toEqual({
      sources: ["platum"],
      dryRun: true,
    });
  });

  it("parses all sources", () => {
    expect(parseArgs(["ingest", "--all"])).toEqual({
      sources: ["platum", "kstartup"],
      dryRun: false,
    });
  });

  it("rejects ambiguous source selection", () => {
    expect(() => parseArgs(["ingest", "--all", "--source=platum"])).toThrow(
      "Choose exactly one",
    );
  });
});
