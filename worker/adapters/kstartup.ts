import type { RawSourceItem, SourceAdapter } from "../types";

type JsonRecord = Record<string, unknown>;

const DEFAULT_ENDPOINT =
  "https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01";

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function stringField(item: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return undefined;
}

export function parseKStartupResponse(payload: unknown): RawSourceItem[] {
  const root = record(payload);
  const data = Array.isArray(root.data)
    ? root.data
    : Array.isArray(record(root.response).data)
      ? (record(root.response).data as unknown[])
      : [];

  return data.map((value) => {
    const item = record(value);
    const externalId = stringField(
      item,
      "pbanc_sn",
      "biz_pbanc_sn",
      "announcementId",
      "id",
    );
    const title = stringField(item, "biz_pbanc_nm", "intg_pbanc_biz_nm", "title");
    const body = [
      stringField(item, "pbanc_ctnt", "biz_pbanc_ctnt", "description"),
      stringField(item, "aply_trgt_ctnt"),
      stringField(item, "supt_biz_clsfc"),
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      externalId,
      title,
      body,
      publishedAt: stringField(
        item,
        "pbanc_rcpt_bgng_dt",
        "pbanc_reg_dt",
        "createdAt",
      ),
      url: stringField(item, "detl_pg_url", "biz_pbanc_url", "url"),
      payload: value,
    };
  });
}

export function createKStartupAdapter(options: {
  serviceKey: string;
  endpoint?: string;
  perPage?: number;
}): SourceAdapter {
  return {
    key: "kstartup",
    name: "K-Startup 지원사업 공고",
    async fetch(cursor) {
      const endpoint = new URL(options.endpoint ?? DEFAULT_ENDPOINT);
      endpoint.searchParams.set("serviceKey", options.serviceKey);
      endpoint.searchParams.set("page", cursor || "1");
      endpoint.searchParams.set("perPage", String(options.perPage ?? 100));
      endpoint.searchParams.set("returnType", "json");

      const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) {
        throw new Error(`K-Startup request failed with HTTP ${response.status}.`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        throw new Error("K-Startup endpoint returned a non-JSON response.");
      }

      return parseKStartupResponse(await response.json());
    },
  };
}
