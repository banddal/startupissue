import { describe, expect, it } from "vitest";

import {
  canonicalizeUrl,
  makeSummary,
  normalizeItem,
  normalizeTitle,
  orderCardPair,
  parsePublishedDate,
  stripHtml,
  truncateUtf8,
} from "./normalize";

describe("ingestion normalization", () => {
  it("normalizes markup, Unicode, punctuation, and whitespace in titles", () => {
    expect(normalizeTitle("<b>ＡI 스타트업</b> — 투자 유치!")).toBe(
      "ai 스타트업 투자 유치",
    );
  });

  it.each([
    ["2026-07-27T10:30:00+09:00", "2026-07-27"],
    ["Sun, 27 Jul 2026 01:30:00 GMT", "2026-07-27"],
    ["2026. 7. 27.", "2026-07-26"],
  ])("parses supported dates: %s", (input, expectedUtcDate) => {
    expect(parsePublishedDate(input)?.toISOString().slice(0, 10)).toBe(expectedUtcDate);
  });

  it("uses collection time and marks an absent publication date as inferred", () => {
    const collectedAt = new Date("2026-07-27T05:00:00.000Z");
    const item = normalizeItem({ title: "공고", payload: {} }, collectedAt);
    expect(item.publishedAt).toEqual(collectedAt);
    expect(item.publishedAtInferred).toBe(true);
  });

  it("keeps a valid future publication date without replacing it", () => {
    const item = normalizeItem(
      { title: "예고 공고", publishedAt: "2027-01-01", payload: {} },
      new Date("2026-07-27T05:00:00.000Z"),
    );
    expect(item.publishedAt.getTime()).toBeGreaterThan(
      new Date("2026-07-27T05:00:00.000Z").getTime(),
    );
    expect(item.publishedAtInferred).toBe(false);
  });

  it("uses external ID before URL and title hashes", () => {
    const item = normalizeItem({
      externalId: "official-1",
      url: "https://example.com/1",
      title: "공고",
      publishedAt: "2026-07-27",
      payload: {},
    });
    expect(item.externalId).toBe("official-1");
    expect(item.urlHash).toBeTruthy();
    expect(item.titleHash).toBeNull();
  });

  it("uses the title and publication date only when URL is unavailable", () => {
    const item = normalizeItem({
      title: "공고",
      publishedAt: "2026-07-27",
      payload: {},
    });
    expect(item.externalId).toBeNull();
    expect(item.urlHash).toBeNull();
    expect(item.titleHash).toHaveLength(64);
  });

  it("removes executable HTML and decodes entities", () => {
    expect(stripHtml("<style>x{}</style><p>A &amp; B</p><script>alert(1)</script>")).toBe(
      "A & B",
    );
  });

  it("preserves announcement titles enclosed in angle brackets", () => {
    expect(normalizeTitle("<2026 로컬 스타트업 챌린지>")).toBe(
      "2026 로컬 스타트업 챌린지",
    );
  });

  it("removes tracking parameters while preserving meaningful query parameters", () => {
    expect(
      canonicalizeUrl("https://example.com/a?utm_source=x&id=7#section"),
    ).toBe("https://example.com/a?id=7");
  });

  it("truncates oversized UTF-8 bodies without breaking a character", () => {
    const result = truncateUtf8("가나다", 7);
    expect(result).toEqual({ value: "가나", truncated: true });
  });

  it("falls back to the title when an excerpt is empty", () => {
    expect(makeSummary({ title: "제목", bodyText: "" })).toBe("제목");
  });

  it("orders merge candidate UUIDs consistently", () => {
    expect(orderCardPair("b", "a")).toEqual(["a", "b"]);
  });
});
