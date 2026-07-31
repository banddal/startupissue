import { describe, expect, it, vi } from "vitest";

import {
  buildOpenAlexWorksUrl,
  fetchOpenAlexWorkCount,
  parseOpenAlexWorkCount,
} from "./openalex";

describe("OpenAlex work count adapter", () => {
  it("builds a monthly search request using publication-date bounds", () => {
    const url = buildOpenAlexWorksUrl({
      apiKey: "secret-key",
      query: "\"artificial intelligence\" startup",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    });

    expect(url.origin + url.pathname).toBe("https://api.openalex.org/works");
    expect(url.searchParams.get("api_key")).toBe("secret-key");
    expect(url.searchParams.get("search")).toBe(
      "\"artificial intelligence\" startup",
    );
    expect(url.searchParams.get("filter")).toBe(
      "from_publication_date:2026-07-01,to_publication_date:2026-07-31",
    );
    expect(url.searchParams.get("per_page")).toBe("1");
  });

  it("returns meta.count and redacts the API key from provenance", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ meta: { count: 27 }, results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchOpenAlexWorkCount({
      apiKey: "secret-key",
      query: "AI startup",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
      fetcher,
    });

    expect(result.count).toBe(27);
    expect(result.requestUrl).not.toContain("secret-key");
    expect(result.requestUrl).toContain("api_key=redacted");
  });

  it("rejects malformed counts and failed responses", async () => {
    expect(() => parseOpenAlexWorkCount({ meta: { count: "27" } })).toThrow(
      "meta.count",
    );

    await expect(
      fetchOpenAlexWorkCount({
        apiKey: "key",
        query: "AI",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        fetcher: vi.fn(async () => new Response("rate limited", { status: 429 })),
      }),
    ).rejects.toThrow("HTTP 429");
  });
});
