const LOW_VALUE_PATTERNS = [
  /(?:세미나|밋업|캠프|강연|교육|워크숍|포럼|컨퍼런스|경진대회|공모전).*(?:개최|열어|마무리|성료|모였|참가)/i,
  /(?:개최|열어|마무리|성료).*(?:세미나|밋업|캠프|강연|교육|워크숍|포럼|컨퍼런스|경진대회|공모전)/i,
  /\[전화성의 스타트업 모닝커피/i,
  /^\[(?:사설|ET시선)\]/i,
  /^\[포토\]/i,
];

export function shouldHideFromMainTimeline(title: string) {
  return LOW_VALUE_PATTERNS.some((pattern) => pattern.test(title.trim()));
}
