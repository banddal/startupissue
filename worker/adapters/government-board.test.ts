import { describe, expect, it } from "vitest";

import { parseMotirBoard, parseMssBoard } from "./government-board";

describe("government board archive parsers", () => {
  it("parses MSS board rows", () => {
    const items = parseMssBoard(
      `<table><tr onclick="doBbsFView('86','1070026','x');" title="창업 지원 자료">
        <td class="subject"><a href="#view">창업 지원 자료</a></td><td>2026.07.24</td>
      </tr></table>`,
      "86",
    );
    expect(items[0]).toMatchObject({
      title: "창업 지원 자료",
      publishedAt: "2026-07-24",
      url: "https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=86&bcIdx=1070026",
    });
  });

  it("parses MOTIR board rows", () => {
    const items = parseMotirBoard(
      `<table><tr><td><a href="javascript:article.view('172070');"><i>민관 투자 확대</i></a></td>
       <td>2026-07-30</td></tr></table>`,
    );
    expect(items[0]).toMatchObject({
      title: "민관 투자 확대",
      publishedAt: "2026-07-30",
      url: "https://www.motir.go.kr/kor/article/ATCL3f49a5a8c/172070/view",
    });
  });
});
