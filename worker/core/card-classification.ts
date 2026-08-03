import type { CardType } from "../../src/lib/card-types";

type ClassificationInput = {
  sourceKey: string;
  defaultCardType: CardType;
  title: string;
};

const INVESTMENT_SIGNALS = [
  /투자\s*유치/i,
  /시드\s*투자/i,
  /프리[-\s]?a/i,
  /시리즈\s*[a-z]/i,
  /후속\s*투자/i,
  /전략적\s*투자/i,
  /지분\s*투자/i,
  /펀드\s*결성/i,
  /출자\s*사업/i,
  /벤처\s*투자/i,
  /엔젤\s*투자/i,
  /투자사.*(?:연결|매칭|ir)/i,
  /(?:m&a|인수합병|인수·합병)/i,
  /엑시트/i,
  /투자처로\s*선정/i,
  /투자\s*검토/i,
  /(?:유상증자|전환사채|cb\s*발행|신주\s*인수)/i,
];

const POLICY_SIGNALS = [
  /(?:중기부|과기정통부|산업부|금융위|정부|국회).*(?:발표|추진|지원|확대|개편|공고)/i,
  /(?:정책|규제|법안|시행령|예산|지원사업|공고).*(?:발표|시행|개정|변경|확대|축소)/i,
  /(?:세제|보조금|지원금).*(?:개편|지원|확대|축소)/i,
];

const TECHNOLOGY_SIGNALS = [
  /(?:신기술|핵심기술|원천기술).*(?:개발|공개|확보|상용화)/i,
  /(?:기술|플랫폼).*(?:개발|공개|출시|상용화)/i,
  /(?:특허|논문|연구결과|연구 결과).*(?:발표|공개|게재|등록)/i,
  /특허.*(?:포트폴리오|확장|분석|확보)/i,
  /(?:ai|인공지능)\s*(?:모델|에이전트|반도체|기술).*(?:개발|공개|출시)/i,
  /(?:ai|인공지능).*(?:제품|서비스|플랫폼|솔루션).*출시/i,
  /(?:ai|인공지능).*출시/i,
  /(?:로봇|반도체|양자|바이오).*(?:기술|연구|개발|상용화)/i,
  /(?:휴머노이드|자율주행).*(?:공개|출시|실증|상용화)/i,
  /오픈소스.*(?:공개|출시)/i,
];

function matches(title: string, signals: RegExp[]) {
  return signals.some((signal) => signal.test(title));
}

export function classifyCardType(input: ClassificationInput): CardType {
  if (input.sourceKey === "kstartup") return "policy";

  const title = input.title.trim();
  if (matches(title, INVESTMENT_SIGNALS)) return "investment";
  if (matches(title, POLICY_SIGNALS)) return "policy";
  if (matches(title, TECHNOLOGY_SIGNALS)) return "technology";
  return input.defaultCardType;
}
