import { describe, expect, it, vi } from "vitest";

import {
  buildArxivQueryUrl,
  fetchArxivWorkCount,
  parseArxivTotalResults,
} from "./arxiv";

const feed = (count: string) => `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"
  xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>${count}</opensearch:totalResults>
</feed>`;

describe("arXiv work count adapter", () => {
  it("builds a monthly submittedDate query", () => {
    const url = buildArxivQueryUrl({
      query: "cat:cs.AI OR cat:cs.LG",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    });

    expect(url.searchParams.get("search_query")).toBe(
      "(cat:cs.AI OR cat:cs.LG) AND submittedDate:[202607010000 TO 202607312359]",
    );
    expect(url.searchParams.get("max_results")).toBe("1");
  });

  it("parses totalResults from the Atom feed", () => {
    expect(parseArxivTotalResults(feed("42"))).toBe(42);
    expect(() => parseArxivTotalResults(feed("unknown"))).toThrow(
      "totalResults",
    );
  });

  it("returns a count and rejects failed responses", async () => {
    const result = await fetchArxivWorkCount({
      query: "cat:cs.AI",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
      fetcher: vi.fn(async () =>
        new Response(feed("17"), {
          status: 200,
          headers: { "content-type": "application/atom+xml" },
        }),
      ),
    });
    expect(result.count).toBe(17);

    await expect(
      fetchArxivWorkCount({
        query: "cat:cs.AI",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        fetcher: vi.fn(async () => new Response("busy", { status: 503 })),
      }),
    ).rejects.toThrow("HTTP 503");
  });
});
