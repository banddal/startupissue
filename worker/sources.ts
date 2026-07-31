import { config } from "dotenv";

import { createKStartupAdapter } from "./adapters/kstartup";
import { createRssAdapter } from "./adapters/rss";
import type { SourceAdapter } from "./types";

config({ path: ".env.local" });
config();

export const sourceKeys = ["platum", "kstartup"] as const;
export type SourceKey = (typeof sourceKeys)[number];

export function getSourceAdapters(): Partial<Record<SourceKey, SourceAdapter>> {
  const adapters: Partial<Record<SourceKey, SourceAdapter>> = {
    platum: createRssAdapter({
      key: "platum",
      name: "플래텀 RSS",
      endpoint: process.env.PLATUM_RSS_URL || "https://platum.kr/feed",
      defaultCardType: "company",
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
