const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function startOfTodayInSeoul(now = new Date()) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - KST_OFFSET_MS,
  );
}

export function cardTimelineLabel(collectedAt: Date, now = new Date()) {
  return collectedAt >= startOfTodayInSeoul(now) ? "새 자료" : "최근 자료";
}
