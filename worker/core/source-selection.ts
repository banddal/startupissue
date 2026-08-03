import type { RawSourceItem } from "../types";

const TECHNOLOGY_CHANGE_SIGNALS = [
  /(?:ai|인공지능|모델|로봇|자율주행|플랫폼|시스템|솔루션|반도체|기술|오픈소스|데이터링크).*(?:개발|공개|출시|상용화|실증|적용|구축|확보|등록|돌파)/i,
  /(?:특허|논문|연구결과|오픈소스)/i,
];

const INVESTMENT_CHANGE_SIGNALS = [
  /투자\s*유치/i,
  /(?:시드|프리[-\s]?a|시리즈\s*[a-z]|후속|전략적|지분)\s*투자/i,
  /(?:펀드|조합)\s*(?:결성|출범|조성)/i,
  /(?:m&a|인수합병|인수·합병|엑시트|유상증자)/i,
  /투자금.*(?:이동|집중|확대|감소)/i,
  /(?:\d[\d,.]*\s*(?:억|조|만)?\s*(?:원|달러)).*투자/i,
];

function title(item: RawSourceItem) {
  return item.title?.replace(/&(?:#8216|#8217|lsquo|rsquo);/gi, "'").trim() ?? "";
}

export function includeTechnologyChange(item: RawSourceItem) {
  const value = title(item);
  if (/^\[(?:포토|사설|ET시선)\]/i.test(value)) return false;
  if (/(?:협력\s*논의|사업\s*추진|협약)/i.test(value)) return false;
  return TECHNOLOGY_CHANGE_SIGNALS.some((signal) => signal.test(value));
}

export function includeInvestmentChange(item: RawSourceItem) {
  const value = title(item);
  return INVESTMENT_CHANGE_SIGNALS.some((signal) => signal.test(value));
}
