import { describe, expect, it } from "vitest";

import { parseRss } from "./rss";

describe("RSS adapter", () => {
  it("parses RSS items and preserves the raw payload", () => {
    const items = parseRss(`
      <rss><channel><item>
        <guid>post-1</guid>
        <title><![CDATA[첫 소식]]></title>
        <link>https://example.com/1</link>
        <description><![CDATA[<p>본문</p>]]></description>
        <pubDate>Sun, 27 Jul 2026 01:30:00 GMT</pubDate>
      </item></channel></rss>
    `);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: "post-1",
      title: "첫 소식",
      url: "https://example.com/1",
      body: "<p>본문</p>",
    });
    expect(items[0]?.payload).toBeTruthy();
  });

  it("treats an empty feed as a successful zero-item result", () => {
    expect(parseRss("<rss><channel></channel></rss>")).toEqual([]);
  });
});
