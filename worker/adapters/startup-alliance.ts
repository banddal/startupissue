import type { RawSourceItem, SourceAdapter } from "../types";

const ORIGIN = "https://startupall.kr";

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseStartupAllianceList(html: string, limit = 20) {
  const items: Array<{ url: string; title: string }> = [];
  const seen = new Set<string>();
  const linkPattern = /<a\b[^>]*href=["'](\/resource\/data\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const path = match[1];
    if (!path || seen.has(path)) continue;
    const content = match[2] ?? "";
    const paragraph = content.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const imageAlt = content.match(/<img\b[^>]*alt=["']([^"']+)["']/i)?.[1];
    const title = decodeHtml(paragraph ?? imageAlt ?? "").replace(/_thumbnail$/i, "");
    if (!title) continue;
    seen.add(path);
    items.push({ url: new URL(path, ORIGIN).toString(), title });
    if (items.length >= limit) break;
  }

  return items;
}

export function parseStartupAllianceDetail(
  html: string,
  fallback: { url: string; title: string },
): RawSourceItem {
  const meta = (property: string) => {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `<meta\\b[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
      "i",
    );
    return pattern.exec(html)?.[1];
  };
  const ogTitle = decodeHtml(meta("og:title") ?? "")
    .replace(/^스타트업얼라이언스\s*\|\s*/i, "")
    .replace(/\s*\|\s*스타트업얼라이언스$/i, "")
    .trim();
  const description = decodeHtml(meta("og:description") ?? meta("description") ?? "");
  const publishedAt = html.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];

  return {
    externalId: fallback.url,
    url: fallback.url,
    title: ogTitle || fallback.title,
    body: description || fallback.title,
    publishedAt,
    payload: { source: "startup-alliance", url: fallback.url },
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "StartupIssues/0.2 (+internal research)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Startup Alliance request failed with HTTP ${response.status}.`);
  return response.text();
}

export function createStartupAllianceAdapter(options?: {
  endpoint?: string;
  limit?: number;
}): SourceAdapter {
  const endpoint = options?.endpoint ?? `${ORIGIN}/resource/data`;
  const limit = options?.limit ?? 20;

  return {
    key: "startup-alliance",
    name: "스타트업얼라이언스 자료",
    defaultCardType: "technology",
    supportsBackfill: true,
    async fetch(cursor) {
      const page = cursor ? Number.parseInt(cursor, 10) : 1;
      const pageUrl = new URL(endpoint);
      if (page > 1) pageUrl.searchParams.set("page", String(page));
      const list = parseStartupAllianceList(await fetchHtml(pageUrl.toString()), limit);
      const items: RawSourceItem[] = [];
      for (let index = 0; index < list.length; index += 5) {
        const batch = list.slice(index, index + 5);
        const results = await Promise.all(
          batch.map(async (item) => parseStartupAllianceDetail(await fetchHtml(item.url), item)),
        );
        items.push(...results);
      }
      return items;
    },
  };
}
