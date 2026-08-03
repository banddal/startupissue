import { describe, expect, it } from "vitest";

import {
  parseBankOfKoreaBaseRate,
  parseKosisCpi,
} from "./economic-indicators";

describe("economic indicator parsers", () => {
  it("reads the official Bank of Korea base-rate block", () => {
    expect(
      parseBankOfKoreaBaseRate(`
        <strong>한국은행기준금리</strong>
        <span class="t"><span class="ctype2"><em>2.75</em>%</span></span>
      `),
    ).toBe(2.75);
  });

  it("reads the KOSIS CPI value and latest period", () => {
    expect(
      parseKosisCpi(`
        <script>var periodList = ['2026.05','2026.06'];</script>
        <li id="totalList_F4991">
          <span>소비자물가지수</span><span>119.99<span> (2020=100)</span></span>
        </li>
      `),
    ).toEqual({ period: "2026.06", value: 119.99 });
  });

  it("returns null values when a provider changes its markup", () => {
    expect(parseBankOfKoreaBaseRate("no rate")).toBeNull();
    expect(parseKosisCpi("no cpi")).toEqual({ period: null, value: null });
  });
});
