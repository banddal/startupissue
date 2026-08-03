import { parseRss } from "./rss";
import type { RawSourceItem, SourceAdapter } from "../types";
import type { CardType } from "../../src/lib/card-types";

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

export function parseMssBoard(html: string, boardId: string): RawSourceItem[] {
  const items: RawSourceItem[] = [];
  const rowPattern = /<tr\b[^>]*onclick=["']doBbsFView\('([^']+)','([^']+)'[^"']*["'][^>]*title=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr>/gi;
  for (const match of html.matchAll(rowPattern)) {
    const [, cbIdx, bcIdx, rawTitle, row] = match;
    if (!cbIdx || !bcIdx || cbIdx !== boardId) continue;
    const date = row?.match(/\b(20\d{2})[.-](\d{2})[.-](\d{2})\b/);
    const url = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=${cbIdx}&bcIdx=${bcIdx}`;
    items.push({
      externalId: url,
      url,
      title: decodeHtml(rawTitle ?? ""),
      publishedAt: date ? `${date[1]}-${date[2]}-${date[3]}` : undefined,
      payload: { source: "mss-board", cbIdx, bcIdx },
    });
  }
  return items;
}

export function parseMotirBoard(html: string): RawSourceItem[] {
  const items: RawSourceItem[] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?article\.view\('([^']+)'\)[\s\S]*?)<\/tr>/gi;
  for (const match of html.matchAll(rowPattern)) {
    const row = match[1] ?? "";
    const id = match[2];
    const title = row.match(/<a\b[^>]*javascript:article\.view[^>]*>[\s\S]*?<i>([\s\S]*?)<\/i>/i)?.[1];
    const date = row.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (!id || !title) continue;
    const url = `https://www.motir.go.kr/kor/article/ATCL3f49a5a8c/${id}/view`;
    items.push({
      externalId: url,
      url,
      title: decodeHtml(title),
      publishedAt: date ? `${date[1]}-${date[2]}-${date[3]}` : undefined,
      payload: { source: "motir-board", id },
    });
  }
  return items;
}

async function fetchText(url: string, method: "GET" | "POST" = "GET") {
  const response = await fetch(url, {
    method,
    headers: { "user-agent": "StartupIssues/0.2 (+internal research)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Government source request failed with HTTP ${response.status}.`);
  return response.text();
}

export function createGovernmentBoardAdapter(options: {
  key: string;
  name: string;
  defaultCardType: CardType;
  rssEndpoint: string;
  rssMethod?: "GET" | "POST";
  pageEndpoint: (page: number) => string;
  parsePage: (html: string) => RawSourceItem[];
  include?: (item: RawSourceItem) => boolean;
}): SourceAdapter {
  return {
    key: options.key,
    name: options.name,
    defaultCardType: options.defaultCardType,
    supportsBackfill: true,
    async fetch(cursor) {
      const items = cursor
        ? options.parsePage(await fetchText(options.pageEndpoint(Number.parseInt(cursor, 10))))
        : parseRss(await fetchText(options.rssEndpoint, options.rssMethod));
      return options.include ? items.filter(options.include) : items;
    },
  };
}
