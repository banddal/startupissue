export const CARD_TYPES = [
  "company",
  "technology",
  "policy",
  "investment",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  company: "기업",
  technology: "기술",
  policy: "정책",
  investment: "투자",
};

export function isCardType(value: string | undefined): value is CardType {
  return CARD_TYPES.some((type) => type === value);
}
