import { describe, expect, it, vi } from "vitest";

import {
  buildArxivQueryUrl,
  fetchArxivPapers,
  fetchArxivWorkCount,
  parseArxivFeed,
  parseArxivTotalResults,
} from "./arxiv";

const feed = (count: string, entry = "") => `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"
  xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
  xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>${count}</opensearch:totalResults>
  ${entry}
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
    expect(url.searchParams.get("max_results")).toBe("100");
    expect(url.searchParams.get("sortBy")).toBe("submittedDate");
  });

  it("parses paper metadata from Atom entries", () => {
    const parsed = parseArxivFeed(
      feed(
        "1",
        `<entry>
          <id>http://arxiv.org/abs/2607.12345v2</id>
          <updated>2026-07-31T12:00:00Z</updated>
          <published>2026-07-30T09:00:00Z</published>
          <title>  Useful   AI Research </title>
          <summary> A practical result. </summary>
          <author><name>Alice Kim</name></author>
          <author><name>Bob Lee</name></author>
          <category term="cs.AI"/>
          <category term="cs.LG"/>
          <arxiv:primary_category term="cs.AI"/>
          <link href="https://arxiv.org/abs/2607.12345" rel="alternate"/>
          <link title="pdf" href="https://arxiv.org/pdf/2607.12345"/>
        </entry>`,
      ),
    );

    expect(parsed.papers).toEqual([
      expect.objectContaining({
        externalId: "2607.12345",
        title: "Useful AI Research",
        summary: "A practical result.",
        authors: ["Alice Kim", "Bob Lee"],
        categories: ["cs.AI", "cs.LG"],
        primaryCategory: "cs.AI",
        pdfUrl: "https://arxiv.org/pdf/2607.12345",
      }),
    ]);
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

  it("returns paper entries and the total in one request", async () => {
    const result = await fetchArxivPapers({
      query: "cat:cs.AI",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
      fetcher: vi.fn(async () =>
        new Response(feed("9667"), {
          status: 200,
          headers: { "content-type": "application/atom+xml" },
        }),
      ),
    });
    expect(result.count).toBe(9667);
    expect(result.papers).toEqual([]);
  });
});
