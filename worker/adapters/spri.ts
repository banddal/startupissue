import type { RawSourceItem, SourceAdapter } from "../types";

const ORIGIN = "https://spri.kr";

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&").replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function parseSpriResearchList(html: string, limit = 20): RawSourceItem[] {
  const items: RawSourceItem[] = [];
  const seen = new Set<string>();
  const links = /<a\b[^>]*href=["'](\/posts\/view\/(\d+)\?code=research)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(links)) {
    const path = match[1];
    const externalId = match[2];
    if (!path || !externalId || seen.has(externalId)) continue;
    const index = match.index ?? 0;
    const before = html.slice(Math.max(0, index - 2_000), index);
    const after = html.slice(index + match[0].length, index + match[0].length + 15_000);
    const dates = [...before.matchAll(/\b(20\d{2}\.\d{2}\.\d{2})\b/g)];
    const publishedAt = dates.at(-1)?.[1]?.replaceAll(".", "-");
    const summary = after.match(/<div\b[^>]*class=["'][^"']*\btext\b[^"']*["'][^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const title = decodeHtml(match[3] ?? "");
    if (!title || !publishedAt) continue;

    seen.add(externalId);
    items.push({
      externalId,
      url: new URL(path, ORIGIN).toString(),
      title,
      body: decodeHtml(summary ?? "") || title,
      publishedAt,
      payload: { provider: "spri", code: "research", externalId },
    });
    if (items.length >= limit) break;
  }
  return items;
}

export function createSpriResearchAdapter(options?: {
  endpoint?: string;
  limit?: number;
  fetcher?: typeof fetch;
}): SourceAdapter {
  const endpoint = options?.endpoint ?? `${ORIGIN}/posts?code=research`;
  return {
    key: "spri-research",
    name: "소프트웨어정책연구소 연구보고서",
    defaultCardType: "technology",
    supportsBackfill: true,
    async fetch(cursor) {
      const url = new URL(endpoint);
      if (cursor && cursor !== "1") url.searchParams.set("page", cursor);
      const response = await (options?.fetcher ?? fetch)(url, {
        headers: { accept: "text/html", "user-agent": "StartupIssues/0.2 (+internal research)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`SPRi request failed with HTTP ${response.status}.`);
      return parseSpriResearchList(await response.text(), options?.limit ?? 20);
    },
  };
}
