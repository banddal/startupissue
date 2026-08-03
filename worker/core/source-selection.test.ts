import { describe, expect, it } from "vitest";

import {
  includeInvestmentChange,
  includeTechnologyChange,
} from "./source-selection";

const item = (title: string) => ({ title, payload: {} });

describe("source selection", () => {
  it("keeps concrete technology changes and drops event noise", () => {
    expect(includeTechnologyChange(item("오픈AI, 새 AI 모델 공개"))).toBe(true);
    expect(includeTechnologyChange(item("서울시, AI 정수장 실증"))).toBe(true);
    expect(includeTechnologyChange(item("AI 정보보안 세미나 개최"))).toBe(false);
    expect(includeTechnologyChange(item("아마존, 분기 매출 2000억달러 첫 돌파"))).toBe(false);
    expect(includeTechnologyChange(item("[포토] 저궤도위성 데이터링크 적용 무인기"))).toBe(false);
    expect(includeTechnologyChange(item("AX 자율주행 대규모 실증 협력 논의"))).toBe(false);
  });

  it("keeps investment events and capital-flow signals", () => {
    expect(includeInvestmentChange(item("슈퍼디스코, 젠엑시스 투자 유치"))).toBe(true);
    expect(includeInvestmentChange(item("AI 투자금, 범용 모델에서 인프라로 이동"))).toBe(true);
    expect(includeInvestmentChange(item("스타트업 밋업에 200명 참가"))).toBe(false);
  });
});
