import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { researchPapers } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeZone: "Asia/Seoul",
});

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [paper] = await db
    .select()
    .from(researchPapers)
    .where(eq(researchPapers.id, id))
    .limit(1);

  if (!paper) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="flex items-center justify-between text-sm">
        <Link className="underline" href="/papers">
          논문 목록
        </Link>
        <Link className="underline" href="/today">
          오늘
        </Link>
      </nav>

      <article className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <time dateTime={paper.publishedAt.toISOString()}>
            {dateFormatter.format(paper.publishedAt)}
          </time>
          <span>·</span>
          <span>{paper.provider}</span>
          {paper.categories.map((category) => (
            <span
              className="rounded-full bg-neutral-100 px-2 py-1"
              key={category}
            >
              {category}
            </span>
          ))}
        </div>

        <h1 className="mt-5 text-3xl font-semibold leading-tight">
          {paper.title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-neutral-600">
          {paper.authors.join(", ")}
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">초록</h2>
          <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-neutral-700">
            {paper.summary}
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            href={paper.abstractUrl}
            rel="noreferrer"
            target="_blank"
          >
            arXiv 원문
          </a>
          {paper.pdfUrl ? (
            <a
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium"
              href={paper.pdfUrl}
              rel="noreferrer"
              target="_blank"
            >
              PDF 보기
            </a>
          ) : null}
        </div>
      </article>
    </main>
  );
}
