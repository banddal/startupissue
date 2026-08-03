import { describe, expect, it } from "vitest";

import { classifyCardType } from "./card-classification";

const classify = (title: string, sourceKey = "platum") =>
  classifyCardType({ sourceKey, defaultCardType: "company", title });

describe("classifyCardType", () => {
  it("keeps K-Startup announcements as policy", () => {
    expect(classify("2026년 창업지원사업 통합공고", "kstartup")).toBe("policy");
  });

  it("detects clear investment events before technology signals", () => {
    expect(classify("스냅스케일, 플랜트 설계 자동화 AI로 시드 투자 유치"))
      .toBe("investment");
    expect(classify("충청권 엔젤투자허브, 투자사 잇는 IR 캠프 열어"))
      .toBe("investment");
    expect(classify("AI 애니메이션 기업, 한일 합작 펀드 첫 투자처로 선정"))
      .toBe("investment");
    expect(classify("엔비디아, 네이버 10억 달러 유상증자 참여"))
      .toBe("investment");
  });

  it("detects policy and technology announcements", () => {
    expect(classify("중기부, 창업 아이디어 보호 지원 확대 발표")).toBe("policy");
    expect(classify("연구진, 차세대 반도체 기술 개발 결과 공개")).toBe("technology");
    expect(classify("HBM 이전에 시작된 3D 반도체 특허, M3D 포트폴리오 확장"))
      .toBe("technology");
    expect(classify("로브로스, 재주넘고 발차기하는 휴머노이드 공개"))
      .toBe("technology");
    expect(classify("라이너, 주식 정보 정리해주는 AI '라이너 파이낸스' 출시"))
      .toBe("technology");
  });

  it("does not force ambiguous company news into another type", () => {
    expect(classify("29세 이하 창업자들이 모였다")).toBe("company");
    expect(classify("오라클은 AI를 지목했다…기술업계 감원은 정말 AI 때문일까"))
      .toBe("company");
  });
});
