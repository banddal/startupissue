import { XMLParser } from "fast-xml-parser";

import type { RawSourceItem, SourceAdapter } from "../types";
import type { CardType } from "../../src/lib/card-types";

type XmlRecord = Record<string, unknown>;

type WordpressPost = {
  id?: string | number;
  date?: string;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  textNodeName: "__text",
});

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function record(value: unknown): XmlRecord {
  return typeof value === "object" && value !== null ? (value as XmlRecord) : {};
}

function text(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const item = record(value);
  const nested = item.__cdata ?? item.__text ?? item["@_href"];
  return nested === undefined ? undefined : String(nested);
}

function decodeHtml(value: string | undefined) {
  return value
    ?.replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/gi, "'")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseWordpressPosts(value: unknown, origin = "https://example.com"): RawSourceItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const post = raw as WordpressPost;
    return {
      externalId:
        post.id === undefined ? post.link : `${origin.replace(/\/$/, "")}/?p=${post.id}`,
      url: post.link,
      title: decodeHtml(post.title?.rendered),
      body: decodeHtml(post.excerpt?.rendered ?? post.content?.rendered),
      publishedAt: post.date ? `${post.date}+09:00` : undefined,
      payload: raw,
    };
  });
}

function parseRssItem(value: unknown): RawSourceItem {
  const item = record(value);
  const link = text(item.link);
  return {
    externalId: text(item.guid) ?? text(item.id) ?? link,
    url: link,
    title: text(item.title),
    body:
      text(item["content:encoded"]) ??
      text(item.content) ??
      text(item.description) ??
      text(item.summary),
    publishedAt: normalizePublishedAt(
      text(item.pubDate) ??
      text(item.published) ??
      text(item.updated) ??
      text(item["dc:date"]),
    ),
    payload: value,
  };
}

function normalizePublishedAt(value: string | undefined) {
  if (!value) return undefined;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!compact) return value;
  return `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}+09:00`;
}

export function parseRss(xml: string): RawSourceItem[] {
  const parsed = record(parser.parse(xml));
  const rssItems = asArray(record(record(parsed.rss).channel).item);
  const atomItems = asArray(record(parsed.feed).entry);
  const items = [...rssItems, ...atomItems].map(parseRssItem);
  const identityCounts = new Map<string, number>();
  for (const item of items) {
    if (item.externalId) {
      identityCounts.set(item.externalId, (identityCounts.get(item.externalId) ?? 0) + 1);
    }
  }
  return items.map((item) =>
    item.externalId && (identityCounts.get(item.externalId) ?? 0) > 1 && item.url
      ? { ...item, externalId: item.url }
      : item,
  );
}

async function fetchText(
  url: string,
  method: "GET" | "POST" = "GET",
  attempts = 3,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: { "user-agent": "StartupIssues/0.2 (+internal research)" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`RSS request failed with HTTP ${response.status}.`);
      }

      const body = await response.text();
      if (/^\s*<!doctype html/i.test(body) || /^\s*<html/i.test(body)) {
        throw new Error("RSS endpoint returned HTML instead of XML.");
      }
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("RSS request failed.");
}

async function fetchWordpressPage(endpoint: string, page: number) {
  const url = new URL(endpoint);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "100");
  url.searchParams.set("_fields", "id,date,link,title,excerpt,content");
  const response = await fetch(url, {
    headers: { "user-agent": "StartupIssues/0.2 (+internal research)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 400) return [];
  if (!response.ok) throw new Error(`WordPress request failed with HTTP ${response.status}.`);
  return parseWordpressPosts(await response.json(), url.origin);
}

export function createRssAdapter(options: {
  key: string;
  name: string;
  endpoint: string;
  defaultCardType: CardType;
  include?: (item: RawSourceItem) => boolean;
  method?: "GET" | "POST";
  pageEndpoint?: (page: number) => string;
  wordpressApiEndpoint?: string;
}): SourceAdapter {
  return {
    key: options.key,
    name: options.name,
    defaultCardType: options.defaultCardType,
    supportsBackfill: Boolean(options.pageEndpoint || options.wordpressApiEndpoint),
    async fetch(cursor) {
      const page = cursor ? Number.parseInt(cursor, 10) : undefined;
      const items = page && options.wordpressApiEndpoint
        ? await fetchWordpressPage(options.wordpressApiEndpoint, page)
        : parseRss(
            await fetchText(
              page && options.pageEndpoint ? options.pageEndpoint(page) : options.endpoint,
              options.method,
            ),
          );
      return options.include ? items.filter(options.include) : items;
    },
  };
}
