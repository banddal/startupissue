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

export const CARD_TYPE_STYLES: Record<
  CardType,
  { card: string; badge: string; count: string; filter: string; filterActive: string }
> = {
  company: {
    card: "border-blue-200 bg-blue-50/50 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
    count: "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-400",
    filter: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
    filterActive: "bg-blue-600 text-white",
  },
  technology: {
    card: "border-violet-200 bg-violet-50/50 hover:border-violet-400",
    badge: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
    count: "border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-400",
    filter: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
    filterActive: "bg-violet-600 text-white",
  },
  policy: {
    card: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400",
    badge: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    count: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400",
    filter: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    filterActive: "bg-emerald-600 text-white",
  },
  investment: {
    card: "border-amber-200 bg-amber-50/50 hover:border-amber-400",
    badge: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
    count: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400",
    filter: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    filterActive: "bg-amber-500 text-amber-950",
  },
};

export function isCardType(value: string | undefined): value is CardType {
  return CARD_TYPES.some((type) => type === value);
}
