import { config } from "dotenv";

import { createKStartupAdapter } from "./adapters/kstartup";
import { createRssAdapter } from "./adapters/rss";
import type { SourceAdapter } from "./types";
import {
  includeInvestmentChange,
  includeTechnologyChange,
} from "./core/source-selection";

config({ path: ".env.local" });
config();

export const sourceKeys = ["platum", "etnews-ai", "wowtale", "kstartup"] as const;
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
  };

  if (process.env.KSTARTUP_SERVICE_KEY) {
    adapters.kstartup = createKStartupAdapter({
      serviceKey: process.env.KSTARTUP_SERVICE_KEY,
      endpoint: process.env.KSTARTUP_API_URL,
    });
  }

  return adapters;
}
