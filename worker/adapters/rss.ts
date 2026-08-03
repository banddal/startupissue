import { XMLParser } from "fast-xml-parser";

import type { RawSourceItem, SourceAdapter } from "../types";
import type { CardType } from "../../src/lib/card-types";

type XmlRecord = Record<string, unknown>;

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
    publishedAt:
      text(item.pubDate) ??
      text(item.published) ??
      text(item.updated) ??
      text(item["dc:date"]),
    payload: value,
  };
}

export function parseRss(xml: string): RawSourceItem[] {
  const parsed = record(parser.parse(xml));
  const rssItems = asArray(record(record(parsed.rss).channel).item);
  const atomItems = asArray(record(parsed.feed).entry);
  return [...rssItems, ...atomItems].map(parseRssItem);
}

async function fetchText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
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

export function createRssAdapter(options: {
  key: string;
  name: string;
  endpoint: string;
  defaultCardType: CardType;
  include?: (item: RawSourceItem) => boolean;
}): SourceAdapter {
  return {
    key: options.key,
    name: options.name,
    defaultCardType: options.defaultCardType,
    async fetch() {
      const items = parseRss(await fetchText(options.endpoint));
      return options.include ? items.filter(options.include) : items;
    },
  };
}
