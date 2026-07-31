import { desc } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/server/db";
import { researchPapers } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default async function PapersPage() {
  const papers = await db
    .select({
      id: researchPapers.id,
      title: researchPapers.title,
      summary: researchPapers.summary,
      authors: researchPapers.authors,
      categories: researchPapers.categories,
      primaryCategory: researchPapers.primaryCategory,
      publishedAt: researchPapers.publishedAt,
    })
    .from(researchPapers)
    .orderBy(desc(researchPapers.publishedAt))
    .limit(100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">연구 아카이브</p>
          <h1 className="mt-1 text-3xl font-semibold">최신 AI 논문</h1>
          <p className="mt-2 text-sm text-neutral-500">
            arXiv AI·머신러닝·언어·비전·로보틱스 분야의 최신 논문입니다.
          </p>
        </div>
        <Link className="text-sm underline" href="/today">
          오늘로 돌아가기
        </Link>
      </header>

      {papers.length === 0 ? (
        <section className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium">아직 수집된 논문이 없습니다.</h2>
          <p className="mt-2 text-sm text-neutral-500">
            지표 수집이 실행되면 최신 논문 메타데이터가 표시됩니다.
          </p>
        </section>
      ) : (
        <ol className="mt-8 grid gap-4">
          {papers.map((paper) => (
            <li key={paper.id}>
              <Link
                className="block rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400"
                href={`/papers/${paper.id}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <time dateTime={paper.publishedAt.toISOString()}>
                    {dateFormatter.format(paper.publishedAt)}
                  </time>
                  {paper.primaryCategory ? (
                    <span className="rounded-full bg-neutral-900 px-2 py-1 text-white">
                      {paper.primaryCategory}
                    </span>
                  ) : null}
                  {paper.categories
                    .filter((category) => category !== paper.primaryCategory)
                    .slice(0, 3)
                    .map((category) => (
                      <span
                        className="rounded-full bg-neutral-100 px-2 py-1"
                        key={category}
                      >
                        {category}
                      </span>
                    ))}
                </div>
                <h2 className="mt-3 text-xl font-semibold">{paper.title}</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  {paper.authors.slice(0, 4).join(", ")}
                  {paper.authors.length > 4
                    ? ` 외 ${paper.authors.length - 4}명`
                    : ""}
                </p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {paper.summary}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
