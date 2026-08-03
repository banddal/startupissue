import { describe, expect, it, vi } from "vitest";

import { createSpriResearchAdapter, parseSpriResearchList } from "./spri";

const html = `<ul class="list"><li><div class="box">
  <div class="data_list_area"><ul><li><span>날짜</span>2026.08.02</li></ul></div>
  <div class="title"><a href="/posts/view/24000?code=research">오픈소스 AI 기술 동향</a></div>
  <div class="text"><p>모델 공개와 생태계 변화를 분석한 보고서입니다.</p></div>
</div></li></ul>`;

describe("SPRi research adapter", () => {
  it("parses the report title, date and summary", () => {
    expect(parseSpriResearchList(html)).toEqual([expect.objectContaining({
      externalId: "24000",
      title: "오픈소스 AI 기술 동향",
      publishedAt: "2026-08-02",
      body: "모델 공개와 생태계 변화를 분석한 보고서입니다.",
    })]);
  });

  it("uses stable pagination for backfill", async () => {
    let requestedUrl: URL | undefined;
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      requestedUrl = new URL(input.toString());
      return new Response(html, { status: 200 });
    });
    await createSpriResearchAdapter({ fetcher }).fetch("3");
    expect(requestedUrl!.searchParams.get("page")).toBe("3");
  });
});
