import { config } from "dotenv";

import { createKStartupAdapter } from "./adapters/kstartup";
import {
  createGovernmentBoardAdapter,
  parseMotirBoard,
  parseMssBoard,
} from "./adapters/government-board";
import { createRssAdapter } from "./adapters/rss";
import { createStartupAllianceAdapter } from "./adapters/startup-alliance";
import { createArxivAdapter } from "./adapters/arxiv";
import { createSpriResearchAdapter } from "./adapters/spri";
import {
  includeInvestmentChange,
  includeStartupPolicy,
  includeStartupRecipe,
  includeTechnologyChange,
} from "./core/source-selection";
import type { SourceAdapter } from "./types";

config({ path: ".env.local" });
config();

export const sourceKeys = [
  "platum",
  "etnews-ai",
  "wowtale",
  "kstartup",
  "mss-press",
  "mss-business",
  "motir-press",
  "startup-recipe",
  "startup-alliance",
  "arxiv",
  "spri-research",
] as const;
export type SourceKey = (typeof sourceKeys)[number];

export function getSourceAdapters(): Partial<Record<SourceKey, SourceAdapter>> {
  const adapters: Partial<Record<SourceKey, SourceAdapter>> = {
    platum: createRssAdapter({
      key: "platum",
      name: "플래텀 RSS",
      endpoint: process.env.PLATUM_RSS_URL || "https://platum.kr/feed",
      wordpressApiEndpoint: "https://platum.kr/wp-json/wp/v2/posts",
      defaultCardType: "company",
    }),
    "etnews-ai": createRssAdapter({
      key: "etnews-ai",
      name: "전자신문 AI RSS",
      endpoint: process.env.ETNEWS_AI_RSS_URL || "https://rss.etnews.com/04046.xml",
      defaultCardType: "technology",
      include: includeTechnologyChange,
    }),
    wowtale: createRssAdapter({
      key: "wowtale",
      name: "와우테일 RSS",
      endpoint: process.env.WOWTALE_RSS_URL || "https://wowtale.net/feed",
      wordpressApiEndpoint: "https://wowtale.net/wp-json/wp/v2/posts",
      defaultCardType: "investment",
      include: includeInvestmentChange,
    }),
    "mss-press": createGovernmentBoardAdapter({
      key: "mss-press",
      name: "중소벤처기업부 보도자료",
      rssEndpoint: "https://www.mss.go.kr/rss/smba/board/86.do",
      pageEndpoint: (page) =>
        `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=86&pageIndex=${page}`,
      parsePage: (html) => parseMssBoard(html, "86"),
      defaultCardType: "policy",
      include: includeStartupPolicy,
    }),
    "mss-business": createGovernmentBoardAdapter({
      key: "mss-business",
      name: "중소벤처기업부 사업공고",
      rssEndpoint: "https://www.mss.go.kr/rss/smba/board/310.do",
      pageEndpoint: (page) =>
        `https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310&pageIndex=${page}`,
      parsePage: (html) => parseMssBoard(html, "310"),
      defaultCardType: "policy",
      include: includeStartupPolicy,
    }),
    "motir-press": createGovernmentBoardAdapter({
      key: "motir-press",
      name: "산업통상부 보도자료",
      rssEndpoint: "https://www.motir.go.kr/kor/article/ATCL3f49a5a8c/rss",
      rssMethod: "POST",
      pageEndpoint: (page) =>
        `https://www.motir.go.kr/kor/article/ATCL3f49a5a8c?pageIndex=${page}`,
      parsePage: parseMotirBoard,
      defaultCardType: "policy",
      include: includeStartupPolicy,
    }),
    "startup-recipe": createRssAdapter({
      key: "startup-recipe",
      name: "스타트업레시피 RSS",
      endpoint: "https://startuprecipe.co.kr/feed",
      wordpressApiEndpoint: "https://startuprecipe.co.kr/wp-json/wp/v2/posts",
      defaultCardType: "company",
      include: includeStartupRecipe,
    }),
    "startup-alliance": createStartupAllianceAdapter(),
    arxiv: createArxivAdapter(),
    "spri-research": createSpriResearchAdapter(),
  };

  if (process.env.KSTARTUP_SERVICE_KEY) {
    adapters.kstartup = createKStartupAdapter({
      serviceKey: process.env.KSTARTUP_SERVICE_KEY,
      endpoint: process.env.KSTARTUP_API_URL,
    });
  }

  return adapters;
}
