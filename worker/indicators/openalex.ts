export type OpenAlexWorkCount = {
  count: number;
  requestUrl: string;
};

type OpenAlexListResponse = {
  meta?: {
    count?: unknown;
  };
};

export function parseOpenAlexWorkCount(payload: unknown) {
  const response =
    typeof payload === "object" && payload !== null
      ? (payload as OpenAlexListResponse)
      : {};
  const count = response.meta?.count;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("OpenAlex response is missing a valid meta.count.");
  }
  return count;
}

export function buildOpenAlexWorksUrl(input: {
  apiKey: string;
  query: string;
  periodStart: Date;
  periodEnd: Date;
  endpoint?: string;
}) {
  const url = new URL(input.endpoint ?? "https://api.openalex.org/works");
  url.searchParams.set("api_key", input.apiKey);
  url.searchParams.set("search", input.query);
  url.searchParams.set(
    "filter",
    [
      `from_publication_date:${input.periodStart.toISOString().slice(0, 10)}`,
      `to_publication_date:${input.periodEnd.toISOString().slice(0, 10)}`,
    ].join(","),
  );
  url.searchParams.set("per_page", "1");
  url.searchParams.set("select", "id");
  return url;
}

export async function fetchOpenAlexWorkCount(input: {
  apiKey: string;
  query: string;
  periodStart: Date;
  periodEnd: Date;
  endpoint?: string;
  fetcher?: typeof fetch;
}): Promise<OpenAlexWorkCount> {
  if (!input.apiKey.trim()) throw new Error("OPENALEX_API_KEY is required.");
  if (!input.query.trim()) throw new Error("OPENALEX_SEARCH_QUERY is required.");

  const url = buildOpenAlexWorksUrl(input);
  const response = await (input.fetcher ?? fetch)(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`OpenAlex request failed with HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error("OpenAlex endpoint returned a non-JSON response.");
  }

  return {
    count: parseOpenAlexWorkCount(await response.json()),
    requestUrl: redactOpenAlexApiKey(url).toString(),
  };
}

export function redactOpenAlexApiKey(url: URL) {
  const safe = new URL(url);
  if (safe.searchParams.has("api_key")) {
    safe.searchParams.set("api_key", "redacted");
  }
  return safe;
}
