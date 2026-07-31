export const CARD_QUALITY_VERDICTS = [
  "valuable",
  "not_valuable",
  "unsure",
] as const;

export type CardQualityVerdict = (typeof CARD_QUALITY_VERDICTS)[number];

export function qualityRate(
  verdicts: readonly CardQualityVerdict[],
): number | null {
  const decided = verdicts.filter((verdict) => verdict !== "unsure");
  if (decided.length === 0) return null;

  return (
    decided.filter((verdict) => verdict === "valuable").length / decided.length
  );
}
