import { describe, expect, it } from "vitest";

import { shouldHideFromMainTimeline } from "./card-visibility";

describe("main timeline visibility", () => {
  it("hides event recaps and recurring promotional columns", () => {
    expect(shouldHideFromMainTimeline("프라이머, U29 파운더스 클럽 밋업 개최")).toBe(true);
    expect(shouldHideFromMainTimeline("[전화성의 스타트업 모닝커피 1367회] 기업 소개")).toBe(true);
  });

  it("keeps concrete policy, technology and investment changes", () => {
    expect(shouldHideFromMainTimeline("중기부, 창업지원사업 통합공고")).toBe(false);
    expect(shouldHideFromMainTimeline("어레이랩스, 2,100만 달러 투자유치")).toBe(false);
    expect(shouldHideFromMainTimeline("오픈AI, 차세대 모델 공개")).toBe(false);
  });
});
