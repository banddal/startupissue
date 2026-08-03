import { DEFAULT_ARXIV_SEARCH_QUERY, fetchArxivPapers } from "../indicators/arxiv";
import type { RawSourceItem, SourceAdapter } from "../types";

const DAY_MS = 24 * 60 * 60 * 1_000;

function dateWindow(cursor?: string, now = new Date()) {
  if (!cursor) {
    return {
      periodStart: new Date(now.getTime() - DAY_MS),
      periodEnd: now,
    };
  }

  const day = Number.parseInt(cursor, 10);
  if (!Number.isFinite(day) || day < 1) throw new Error("arXiv cursor must be a positive day number.");
  const periodEnd = new Date(now);
  periodEnd.setUTCHours(23, 59, 59, 999);
  periodEnd.setUTCDate(periodEnd.getUTCDate() - (day - 1));
  const periodStart = new Date(periodEnd);
  periodStart.setUTCHours(0, 0, 0, 0);
  return { periodStart, periodEnd };
}

export function createArxivAdapter(options?: {
  query?: string;
  maxResults?: number;
  endpoint?: string;
  now?: () => Date;
  fetcher?: typeof fetch;
}): SourceAdapter {
  return {
    key: "arxiv",
    name: "arXiv 최신 기술 논문",
    defaultCardType: "technology",
    supportsBackfill: true,
    async fetch(cursor) {
      const window = dateWindow(cursor, options?.now?.() ?? new Date());
      const result = await fetchArxivPapers({
        query: options?.query ?? process.env.ARXIV_SEARCH_QUERY ?? DEFAULT_ARXIV_SEARCH_QUERY,
        maxResults: options?.maxResults ?? 10,
        endpoint: options?.endpoint,
        fetcher: options?.fetcher,
        ...window,
      });

      return result.papers.map((paper): RawSourceItem => ({
        externalId: paper.externalId,
        url: paper.abstractUrl,
        title: paper.title,
        body: [
          paper.summary,
          paper.authors.length > 0 ? `Authors: ${paper.authors.join(", ")}` : "",
          paper.categories.length > 0 ? `Categories: ${paper.categories.join(", ")}` : "",
        ].filter(Boolean).join("\n\n"),
        publishedAt: paper.publishedAt.toISOString(),
        attachments: paper.pdfUrl ? [paper.pdfUrl] : [],
        payload: { provider: "arxiv", ...paper },
      }));
    },
  };
}
