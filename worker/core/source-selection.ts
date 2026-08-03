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

const STARTUP_POLICY_SIGNALS = [
  /스타트업|창업|소셜벤처|스케일업/i,
  /벤처캐피털|벤처투자|VC\b|CVC\b/i,
  /투자유치|모태펀드|벤처펀드|창업펀드/i,
  /기술사업화|규제샌드박스|프리팁스|팁스|TIPS/i,
  /오픈이노베이션|기업가정신|창업생태계|딥테크/i,
];

export function includeStartupPolicy(item: RawSourceItem) {
  const value = `${title(item)} ${item.body ?? ""}`.replace(/중소벤처기업부/g, "");
  return STARTUP_POLICY_SIGNALS.some((signal) => signal.test(value));
}

export function includeStartupRecipe(item: RawSourceItem) {
  return !/^\[(?:이번주행사|주간행사)\]/i.test(title(item));
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
