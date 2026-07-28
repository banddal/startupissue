import { describe, expect, it } from "vitest";

import { parseKStartupResponse } from "./kstartup";

describe("K-Startup adapter", () => {
  it("maps the official announcement response fields", () => {
    expect(
      parseKStartupResponse({
        data: [
          {
            pbanc_sn: "42",
            biz_pbanc_nm: "창업기업 모집",
            pbanc_ctnt: "<p>지원 내용</p>",
            aply_trgt_ctnt: "예비창업자",
            pbanc_rcpt_bgng_dt: "20260727",
            detl_pg_url: "https://example.com/42",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        externalId: "42",
        title: "창업기업 모집",
        publishedAt: "20260727",
        url: "https://example.com/42",
      }),
    ]);
  });

  it("returns an empty list for a valid response with no data", () => {
    expect(parseKStartupResponse({ data: [] })).toEqual([]);
  });
});
