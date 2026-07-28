import { createHash } from "node:crypto";

import type { NormalizedSourceItem, RawSourceItem } from "../types";

export const MAX_BODY_BYTES = 500 * 1024;

const htmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }

    return htmlEntities[code.toLowerCase()] ?? entity;
  });
}

export function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/?[a-z][^>]*>/gi, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(value: string): string {
  return stripHtml(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”‘’"'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeUrl(value?: string): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePublishedDate(value?: string): Date | null {
  if (!value?.trim()) return null;

  const normalized = value
    .trim()
    .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3T00:00:00+09:00")
    .replace(
      /^(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})일?$/,
      "$1-$2-$3T00:00:00+09:00",
    );
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function truncateUtf8(value: string, maxBytes = MAX_BODY_BYTES) {
  const buffer = Buffer.from(value);
  if (buffer.byteLength <= maxBytes) {
    return { value, truncated: false };
  }

  let end = maxBytes;
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) end -= 1;
  return { value: buffer.subarray(0, end).toString("utf8"), truncated: true };
}

export function normalizeItem(
  raw: RawSourceItem,
  collectedAt = new Date(),
): NormalizedSourceItem {
  const title = stripHtml(raw.title ?? "").trim();
  if (!title) throw new Error("A source item must have a title.");

  const normalizedTitle = normalizeTitle(title);
  const canonicalUrl = canonicalizeUrl(raw.url);
  const parsedPublishedAt = parsePublishedDate(raw.publishedAt);
  const publishedAt = parsedPublishedAt ?? collectedAt;
  const body = truncateUtf8(stripHtml(raw.body ?? ""));

  return {
    externalId: raw.externalId?.trim() || null,
    canonicalUrl,
    urlHash: canonicalUrl ? sha256(canonicalUrl) : null,
    title,
    normalizedTitle,
    titleHash: canonicalUrl
      ? null
      : sha256(`${normalizedTitle}\n${publishedAt.toISOString().slice(0, 10)}`),
    bodyText: body.value,
    contentHash: sha256(body.value),
    publishedAt,
    publishedAtInferred: parsedPublishedAt === null,
    attachmentUrls: raw.attachments ?? [],
    rawPayload: raw.payload,
    bodyTruncated: body.truncated,
  };
}

export function makeSummary(item: Pick<NormalizedSourceItem, "bodyText" | "title">): string {
  const excerpt = item.bodyText.slice(0, 280).trim();
  return excerpt || item.title;
}

export function orderCardPair(cardIdA: string, cardIdB: string): [string, string] {
  return cardIdA < cardIdB ? [cardIdA, cardIdB] : [cardIdB, cardIdA];
}
