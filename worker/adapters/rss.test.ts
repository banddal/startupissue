import { describe, expect, it } from "vitest";

import { parseRss, parseWordpressPosts } from "./rss";

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

  it("uses the item URL when a feed repeats ids and parses compact Korean dates", () => {
    const items = parseRss(`
      <rss><channel>
        <item><id>86</id><link>https://example.com/1</link><title>첫 글</title><pubDate>20260730074459</pubDate></item>
        <item><id>86</id><link>https://example.com/2</link><title>둘째 글</title><pubDate>20260729135006</pubDate></item>
      </channel></rss>
    `);

    expect(items.map((item) => item.externalId)).toEqual([
      "https://example.com/1",
      "https://example.com/2",
    ]);
    expect(items[0]?.publishedAt).toBe("2026-07-30T07:44:59+09:00");
  });

  it("parses WordPress archive posts", () => {
    expect(
      parseWordpressPosts([
        {
          id: 7,
          date: "2026-07-10T09:30:00",
          link: "https://example.com/7",
          title: { rendered: "스타트업 &#8217;소식&#8217;" },
          excerpt: { rendered: "<p>요약 본문</p>" },
        },
      ], "https://example.com")[0],
    ).toMatchObject({
      externalId: "https://example.com/?p=7",
      title: "스타트업 '소식'",
      body: "요약 본문",
      publishedAt: "2026-07-10T09:30:00+09:00",
    });
  });
});
