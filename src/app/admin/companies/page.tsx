import { asc, desc } from "drizzle-orm";
import Link from "next/link";

import { createCompanyCandidate } from "@/app/admin/companies/actions";
import { CompanyReviewForm } from "@/components/company-review-form";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { companies, companyVerifications } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default async function AdminCompaniesPage() {
  await requireAdmin();

  const [companyRows, verificationRows] = await Promise.all([
    db
      .select()
      .from(companies)
      .orderBy(asc(companies.sectorKey), asc(companies.name)),
    db
      .select()
      .from(companyVerifications)
      .orderBy(desc(companyVerifications.observedAt)),
  ]);

  const evidenceByCompany = new Map(
    companyRows.map((company) => [
      company.id,
      verificationRows.filter(
        (verification) => verification.companyId === company.id,
      ),
    ]),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">관리자</p>
          <h1 className="mt-1 text-3xl font-semibold">기업 명부와 후보</h1>
        </div>
        <Link className="text-sm underline" href="/today">
          오늘로 돌아가기
        </Link>
      </header>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">후보 수동 등록</h2>
        <p className="mt-2 text-sm text-neutral-500">
          기업 여부를 직접 판정하지 않고 확인 근거와 함께 후보로 등록합니다.
        </p>
        <form
          action={createCompanyCandidate}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <label className="grid gap-1 text-sm">
            기업명
            <input className="rounded-md border p-2" name="name" required />
          </label>
          <label className="grid gap-1 text-sm">
            섹터 키
            <input
              className="rounded-md border p-2"
              name="sectorKey"
              placeholder="예: bio-health"
              required
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            별칭
            <input
              className="rounded-md border p-2"
              name="aliases"
              placeholder="쉼표로 구분"
            />
          </label>
          <label className="grid gap-1 text-sm">
            근거 유형
            <select className="rounded-md border p-2" name="verificationKind">
              <option value="government_program">정부 지원사업</option>
              <option value="tips">TIPS</option>
              <option value="portfolio">AC/VC 포트폴리오</option>
              <option value="demo_day">데모데이</option>
              <option value="self_declared">자기선언</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            확인일
            <input
              className="rounded-md border p-2"
              name="observedAt"
              required
              type="date"
            />
          </label>
          <label className="grid gap-1 text-sm">
            근거 이름
            <input className="rounded-md border p-2" name="sourceName" required />
          </label>
          <label className="grid gap-1 text-sm">
            근거 URL
            <input className="rounded-md border p-2" name="sourceUrl" type="url" />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            메모
            <textarea className="rounded-md border p-2" name="note" rows={3} />
          </label>
          <button
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white sm:col-span-2"
            type="submit"
          >
            후보 등록
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-4">
        {companyRows.map((company) => (
          <article
            className="rounded-2xl border border-neutral-200 bg-white p-6"
            key={company.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  {company.sectorKey}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{company.name}</h2>
                {company.aliases.length > 0 ? (
                  <p className="mt-1 text-sm text-neutral-500">
                    별칭: {company.aliases.join(", ")}
                  </p>
                ) : null}
              </div>
              <CompanyReviewForm
                companyId={company.id}
                currentStatus={company.status}
              />
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {(evidenceByCompany.get(company.id) ?? []).map((evidence) => (
                <li className="rounded-lg bg-neutral-50 p-3" key={evidence.id}>
                  <span className="font-medium">{evidence.sourceName}</span>
                  {" · "}
                  {evidence.kind}
                  {" · "}
                  {dateFormatter.format(evidence.observedAt)}
                  {evidence.sourceUrl ? (
                    <>
                      {" · "}
                      <a
                        className="underline"
                        href={evidence.sourceUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        근거 보기
                      </a>
                    </>
                  ) : null}
                  {evidence.note ? (
                    <p className="mt-1 text-neutral-600">{evidence.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
        {companyRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-neutral-500">
            등록된 기업 후보가 없습니다.
          </p>
        ) : null}
      </section>
    </main>
  );
}
