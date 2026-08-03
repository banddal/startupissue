import { describe, expect, it } from "vitest";

import {
  parseStartupAllianceDetail,
  parseStartupAllianceList,
} from "./startup-alliance";

describe("Startup Alliance adapter", () => {
  it("extracts unique public resource links and titles", () => {
    const html = `
      <a href="/resource/data/report-one"><img alt="fallback_thumbnail"><p>첫 보고서</p></a>
      <a href="/resource/data/report-one"><p>중복</p></a>
      <a href="/resource/data/report-two"><img alt="두 번째 보고서_thumbnail"></a>
    `;

    expect(parseStartupAllianceList(html)).toEqual([
      { url: "https://startupall.kr/resource/data/report-one", title: "첫 보고서" },
      { url: "https://startupall.kr/resource/data/report-two", title: "두 번째 보고서" },
    ]);
  });

  it("uses detail metadata and published date", () => {
    const item = parseStartupAllianceDetail(
      `<meta property="og:title" content="스타트업얼라이언스 | AI 보고서 | 스타트업얼라이언스">
       <meta property="og:description" content="&lt;p&gt;보고서 설명&lt;/p&gt;">
       <time>2026-07-30</time>`,
      { url: "https://startupall.kr/resource/data/ai", title: "대체 제목" },
    );

    expect(item).toMatchObject({
      title: "AI 보고서",
      body: "보고서 설명",
      publishedAt: "2026-07-30",
    });
  });
});
