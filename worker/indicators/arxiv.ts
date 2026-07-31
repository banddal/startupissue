import { XMLParser } from "fast-xml-parser";

export const DEFAULT_ARXIV_SEARCH_QUERY =
  "(cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO)";

type ArxivFeed = {
  feed?: {
    "opensearch:totalResults"?: unknown;
  };
};

function arxivTimestamp(date: Date, endOfDay = false) {
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${day}${endOfDay ? "2359" : "0000"}`;
}

export function buildArxivQueryUrl(input: {
  query: string;
  periodStart: Date;
  periodEnd: Date;
  endpoint?: string;
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
  url.searchParams.set("max_results", "1");
  return url;
}

export function parseArxivTotalResults(xml: string) {
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
  return count;
}

export async function fetchArxivWorkCount(input: {
  query: string;
  periodStart: Date;
  periodEnd: Date;
  endpoint?: string;
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
  return {
    count: parseArxivTotalResults(body),
    requestUrl: url.toString(),
  };
}
