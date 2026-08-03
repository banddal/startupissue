export type EconomicIndicator = {
  code: "usdkrw" | "kospi" | "kosdaq" | "base-rate" | "cpi";
  label: string;
  value: number | null;
  unit: string;
  change: number | null;
  changeUnit: string;
  observedLabel: string | null;
  sourceLabel: string;
  sourceUrl: string;
  status: "available" | "unavailable";
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
      };
    }>;
  };
};

const BOK_URL = "https://www.bok.or.kr/portal/main/main.do?menuNo=200690";
const KOSIS_CPI_URL =
  "https://kosis.kr/visual/nsportalStats/detailContents.do?listId=F&statJipyoId=3698&vStatJipyoId=4991";

const observedFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export function parseBankOfKoreaBaseRate(html: string) {
  const match = html.match(
    /<strong>\s*한국은행기준금리\s*<\/strong>[\s\S]{0,300}?<em>\s*([0-9.]+)\s*<\/em>/i,
  );
  return match ? Number(match[1]) : null;
}

export function parseKosisCpi(html: string) {
  const item = html.match(
    /<li id="totalList_F4991">([\s\S]*?)<\/li>/i,
  )?.[1];
  const valueMatch = item?.match(
    /소비자물가지수[\s\S]*?<span>\s*([0-9.]+)\s*<span>\s*\(2020=100\)/i,
  );
  const periods = [...html.matchAll(/'(20\d{2}\.\d{2})'/g)];
  const period = periods.at(-1)?.[1] ?? null;
  const value = valueMatch ? Number(valueMatch[1]) : null;
  return { period, value };
}

async function fetchYahooIndicator(input: {
  code: EconomicIndicator["code"];
  label: string;
  symbol: string;
  unit: string;
  sourceUrl: string;
}) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(input.symbol)}?interval=1d&range=5d`,
    { next: { revalidate: 900 } },
  );
  if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);
  const payload = (await response.json()) as YahooChartResponse;
  const meta = payload.chart?.result?.[0]?.meta;
  const value = meta?.regularMarketPrice;
  if (typeof value !== "number") throw new Error("Market value is missing");
  const previous = meta?.chartPreviousClose ?? meta?.previousClose;

  return {
    code: input.code,
    label: input.label,
    value,
    unit: input.unit,
    change: typeof previous === "number" ? value - previous : null,
    changeUnit: input.unit,
    observedLabel: meta?.regularMarketTime
      ? observedFormatter.format(new Date(meta.regularMarketTime * 1000))
      : null,
    sourceLabel: "Yahoo Finance",
    sourceUrl: input.sourceUrl,
    status: "available",
  } satisfies EconomicIndicator;
}

async function fetchBaseRate() {
  const response = await fetch(BOK_URL, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Bank of Korea returned ${response.status}`);
  const value = parseBankOfKoreaBaseRate(await response.text());
  if (value === null) throw new Error("Base rate is missing");
  return {
    code: "base-rate",
    label: "기준금리",
    value,
    unit: "%",
    change: null,
    changeUnit: "%p",
    observedLabel: "한국은행 현재 공시",
    sourceLabel: "한국은행",
    sourceUrl: BOK_URL,
    status: "available",
  } satisfies EconomicIndicator;
}

async function fetchCpi() {
  const response = await fetch(KOSIS_CPI_URL, { next: { revalidate: 21600 } });
  if (!response.ok) throw new Error(`KOSIS returned ${response.status}`);
  const { period, value } = parseKosisCpi(await response.text());
  if (value === null) throw new Error("CPI value is missing");
  return {
    code: "cpi",
    label: "소비자물가지수",
    value,
    unit: "",
    change: null,
    changeUnit: "",
    observedLabel: period ? `${period.replace(".", "년 ")}월` : null,
    sourceLabel: "KOSIS 국가통계포털",
    sourceUrl: KOSIS_CPI_URL,
    status: "available",
  } satisfies EconomicIndicator;
}

function unavailable(
  code: EconomicIndicator["code"],
  label: string,
  unit: string,
  sourceLabel: string,
  sourceUrl: string,
): EconomicIndicator {
  return {
    code,
    label,
    value: null,
    unit,
    change: null,
    changeUnit: unit,
    observedLabel: null,
    sourceLabel,
    sourceUrl,
    status: "unavailable",
  };
}

async function safeLoad(
  load: () => Promise<EconomicIndicator>,
  fallback: EconomicIndicator,
) {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function getEconomicIndicators() {
  return Promise.all([
    safeLoad(
      () =>
        fetchYahooIndicator({
          code: "usdkrw",
          label: "원·달러 환율",
          symbol: "KRW=X",
          unit: "원",
          sourceUrl: "https://finance.yahoo.com/quote/KRW=X/",
        }),
      unavailable("usdkrw", "원·달러 환율", "원", "Yahoo Finance", "https://finance.yahoo.com/quote/KRW=X/"),
    ),
    safeLoad(
      () =>
        fetchYahooIndicator({
          code: "kospi",
          label: "KOSPI",
          symbol: "^KS11",
          unit: "",
          sourceUrl: "https://finance.yahoo.com/quote/%5EKS11/",
        }),
      unavailable("kospi", "KOSPI", "", "Yahoo Finance", "https://finance.yahoo.com/quote/%5EKS11/"),
    ),
    safeLoad(
      () =>
        fetchYahooIndicator({
          code: "kosdaq",
          label: "KOSDAQ",
          symbol: "^KQ11",
          unit: "",
          sourceUrl: "https://finance.yahoo.com/quote/%5EKQ11/",
        }),
      unavailable("kosdaq", "KOSDAQ", "", "Yahoo Finance", "https://finance.yahoo.com/quote/%5EKQ11/"),
    ),
    safeLoad(
      fetchBaseRate,
      unavailable("base-rate", "기준금리", "%", "한국은행", BOK_URL),
    ),
    safeLoad(
      fetchCpi,
      unavailable("cpi", "소비자물가지수", "", "KOSIS 국가통계포털", KOSIS_CPI_URL),
    ),
  ]);
}
