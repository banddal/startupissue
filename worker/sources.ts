import { config } from "dotenv";

import { createKStartupAdapter } from "./adapters/kstartup";
import { createRssAdapter } from "./adapters/rss";
import { createStartupAllianceAdapter } from "./adapters/startup-alliance";
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
] as const;
export type SourceKey = (typeof sourceKeys)[number];

export function getSourceAdapters(): Partial<Record<SourceKey, SourceAdapter>> {
  const adapters: Partial<Record<SourceKey, SourceAdapter>> = {
    platum: createRssAdapter({
      key: "platum",
      name: "플래텀 RSS",
      endpoint: process.env.PLATUM_RSS_URL || "https://platum.kr/feed",
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
      defaultCardType: "investment",
      include: includeInvestmentChange,
    }),
    "mss-press": createRssAdapter({
      key: "mss-press",
      name: "중소벤처기업부 보도자료",
      endpoint: "https://www.mss.go.kr/rss/smba/board/86.do",
      defaultCardType: "policy",
      include: includeStartupPolicy,
    }),
    "mss-business": createRssAdapter({
      key: "mss-business",
      name: "중소벤처기업부 사업공고",
      endpoint: "https://www.mss.go.kr/rss/smba/board/310.do",
      defaultCardType: "policy",
      include: includeStartupPolicy,
    }),
    "motir-press": createRssAdapter({
      key: "motir-press",
      name: "산업통상부 보도자료",
      endpoint: "https://www.motir.go.kr/kor/article/ATCL3f49a5a8c/rss",
      method: "POST",
      defaultCardType: "policy",
      include: includeStartupPolicy,
    }),
    "startup-recipe": createRssAdapter({
      key: "startup-recipe",
      name: "스타트업레시피 RSS",
      endpoint: "https://startuprecipe.co.kr/feed",
      defaultCardType: "company",
      include: includeStartupRecipe,
    }),
    "startup-alliance": createStartupAllianceAdapter(),
  };

  if (process.env.KSTARTUP_SERVICE_KEY) {
    adapters.kstartup = createKStartupAdapter({
      serviceKey: process.env.KSTARTUP_SERVICE_KEY,
      endpoint: process.env.KSTARTUP_API_URL,
    });
  }

  return adapters;
}
