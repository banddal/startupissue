import { describe, expect, it, vi } from "vitest";

import { createArxivAdapter } from "./arxiv";

const feed = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2608.12345v1</id>
    <updated>2026-08-03T02:00:00Z</updated><published>2026-08-03T01:00:00Z</published>
    <title>Useful Agent Research</title><summary>A practical result.</summary>
    <author><name>Alice Kim</name></author><category term="cs.AI"/>
    <arxiv:primary_category term="cs.AI"/><link title="pdf" href="https://arxiv.org/pdf/2608.12345"/>
  </entry>
</feed>`;

describe("arXiv source adapter", () => {
  it("turns papers into technology source items and limits each day", async () => {
    let requestedUrl: URL | undefined;
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      requestedUrl = new URL(input.toString());
      return new Response(feed, { status: 200 });
    });
    const adapter = createArxivAdapter({
      fetcher,
      now: () => new Date("2026-08-03T12:00:00Z"),
    });
    const [item] = await adapter.fetch("2");

    expect(item).toEqual(expect.objectContaining({
      externalId: "2608.12345",
      title: "Useful Agent Research",
      publishedAt: "2026-08-03T01:00:00.000Z",
      attachments: ["https://arxiv.org/pdf/2608.12345"],
    }));
    const url = requestedUrl!;
    expect(url.searchParams.get("max_results")).toBe("10");
    expect(url.searchParams.get("search_query")).toContain("submittedDate:[202608020000 TO 202608022359]");
  });
});
