import type {
  InformationValueBadge,
  InformationValueBreakdown,
} from "../../src/server/db/schema";

export const INFORMATION_VALUE_RULE_VERSION = "2026-07-v1";

export const INFORMATION_VALUE_WEIGHTS = {
  sourceTier: { 1: 3, 2: 2, 3: 1 },
  freshness: { sameDay: 3, threeDays: 2, sevenDays: 1, older: 0 },
  duplicateRisk: -2,
} as const;

export type InformationValueInput = {
  sourceTier: number;
  publishedAt: Date;
  evaluatedAt: Date;
  hasDuplicateCandidates: boolean;
};

export type InformationValueResult = {
  score: number;
  breakdown: InformationValueBreakdown;
  reason: string;
  badge: InformationValueBadge;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function freshness(daysOld: number) {
  if (daysOld <= 1) return { score: 3, reason: "발표 후 24시간 이내" };
  if (daysOld <= 3) return { score: 2, reason: "발표 후 3일 이내" };
  if (daysOld <= 7) return { score: 1, reason: "발표 후 7일 이내" };
  return { score: 0, reason: "발표 후 7일 경과" };
}

function badgeFor(score: number): InformationValueBadge {
  if (score >= 6) return "major_change";
  if (score >= 4) return "new_signal";
  if (score >= 2) return "follow_up";
  return "reference";
}

export function assessInformationValue(
  input: InformationValueInput,
): InformationValueResult {
  const tier = Math.min(3, Math.max(1, Math.trunc(input.sourceTier))) as 1 | 2 | 3;
  const sourceTier = {
    score: INFORMATION_VALUE_WEIGHTS.sourceTier[tier],
    reason: `${tier}급 소스`,
  };
  const daysOld = Math.max(
    0,
    (input.evaluatedAt.getTime() - input.publishedAt.getTime()) / DAY_MS,
  );
  const freshnessResult = freshness(daysOld);
  const duplicateRisk = input.hasDuplicateCandidates
    ? { score: INFORMATION_VALUE_WEIGHTS.duplicateRisk, reason: "중복 후보 있음" }
    : { score: 0, reason: "중복 후보 없음" };
  const breakdown = {
    sourceTier,
    freshness: freshnessResult,
    duplicateRisk,
  };
  const score = Object.values(breakdown).reduce(
    (total, component) => total + component.score,
    0,
  );

  return {
    score,
    breakdown,
    reason: `${sourceTier.reason} ${sourceTier.score > 0 ? "+" : ""}${sourceTier.score}, ${freshnessResult.reason} +${freshnessResult.score}${duplicateRisk.score ? `, ${duplicateRisk.reason} ${duplicateRisk.score}` : ""}`,
    badge: badgeFor(score),
  };
}
