import { XMLParser } from "fast-xml-parser";

export const DEFAULT_ARXIV_SEARCH_QUERY =
  "(cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO)";

type ArxivFeed = {
  feed?: {
    "opensearch:totalResults"?: unknown;
    entry?: unknown;
  };
};

export type ArxivPaper = {
  externalId: string;
  title: string;
  summary: string;
  authors: string[];
  categories: string[];
  primaryCategory: string | null;
  abstractUrl: string;
  pdfUrl: string | null;
  publishedAt: Date;
  updatedAt: Date;
};

type XmlRecord = Record<string, unknown>;

function record(value: unknown): XmlRecord {
  return typeof value === "object" && value !== null
    ? (value as XmlRecord)
    : {};
}

function list(value: unknown) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function arxivTimestamp(date: Date, endOfDay = false) {
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${day}${endOfDay ? "2359" : "0000"}`;
}

export function buildArxivQueryUrl(input: {
  query: string;
  periodStart: Date;
  periodEnd: Date;
  endpoint?: string;
  maxResults?: number;
}) {
  if (!input.query.trim()) throw new Error("ARXIV_SEARCH_QUERY is required.");

  const url = new URL(
    input.endpoint ?? "https://export.arxiv.org/api/query",
  );
  const dateRange = `submittedDate:[${arxivTimestamp(input.periodStart)} TO ${arxivTimestamp(input.periodEnd, true)}]`;
  url.searchParams.set(
    "search_query",
    `(${input.query.trim()}) AND ${dateRange}`,
  );
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(input.maxResults ?? 100));
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");
  return url;
}

export function parseArxivFeed(xml: string) {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  }).parse(xml) as ArxivFeed;
  const raw = parsed.feed?.["opensearch:totalResults"];
  const count =
    typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("arXiv response is missing a valid totalResults.");
  }

  const papers = list(parsed.feed?.entry).map((rawEntry): ArxivPaper => {
    const entry = record(rawEntry);
    const sourceIdUrl = text(entry.id);
    const externalId = sourceIdUrl
      .replace(/^https?:\/\/arxiv\.org\/abs\//, "")
      .replace(/v\d+$/, "");
    const abstractUrl = `https://arxiv.org/abs/${externalId}`;
    const publishedAt = new Date(text(entry.published));
    const updatedAt = new Date(text(entry.updated));
    if (
      !externalId ||
      !text(entry.title) ||
      !text(entry.summary) ||
      Number.isNaN(publishedAt.getTime()) ||
      Number.isNaN(updatedAt.getTime())
    ) {
      throw new Error("arXiv response contains an invalid paper entry.");
    }

    const categories = list(entry.category)
      .map((category) => text(record(category)["@_term"]))
      .filter(Boolean);
    const primaryCategory =
      text(record(entry["arxiv:primary_category"])["@_term"]) || null;
    const pdfUrl =
      list(entry.link)
        .map(record)
        .find((link) => text(link["@_title"]) === "pdf")?.["@_href"] ?? null;

    return {
      externalId,
      title: text(entry.title),
      summary: text(entry.summary),
      authors: list(entry.author)
        .map((author) => text(record(author).name))
        .filter(Boolean),
      categories,
      primaryCategory,
      abstractUrl,
      pdfUrl: text(pdfUrl).replace(/^http:\/\//, "https://") || null,
      publishedAt,
      updatedAt,
    };
  });

  return { count, papers };
}

export function parseArxivTotalResults(xml: string) {
  return parseArxivFeed(xml).count;
}

export async function fetchArxivPapers(input: {
  query: string;
  periodStart: Date;
  periodEnd: Date;
  endpoint?: string;
  maxResults?: number;
  fetcher?: typeof fetch;
}) {
  const url = buildArxivQueryUrl(input);
  const response = await (input.fetcher ?? fetch)(url, {
    headers: {
      accept: "application/atom+xml",
      "user-agent": "startupissue/0.2 (research indicator collector)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`arXiv request failed with HTTP ${response.status}.`);
  }

  const body = await response.text();
  const parsed = parseArxivFeed(body);
  return {
    count: parsed.count,
    papers: parsed.papers,
    requestUrl: url.toString(),
  };
}

export async function fetchArxivWorkCount(
  input: Parameters<typeof fetchArxivPapers>[0],
) {
  const result = await fetchArxivPapers({ ...input, maxResults: 1 });
  return { count: result.count, requestUrl: result.requestUrl };
}
