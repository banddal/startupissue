export const COMPANY_STATUSES = ["candidate", "approved", "rejected"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export function normalizeCompanyName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/\s+/g, " ")
    .replace(/\s*(주식회사|\(주\)|㈜)\s*/g, "")
    .trim();
}

export function parseCompanyAliases(value: string) {
  return [...new Set(
    value
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean),
  )];
}
