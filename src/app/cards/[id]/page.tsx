import { and, eq, isNull, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActiveUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { cards, cardSources, sourceItems, sources } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireActiveUser();
  const { id } = await params;

  const [item] = await db
    .select({
      id: cards.id,
      title: cards.title,
      summary: cards.summary,
      publishedAt: cards.publishedAt,
      collectedAt: cards.collectedAt,
      bodyTruncated: cards.bodyTruncated,
      bodyText: sourceItems.bodyText,
      canonicalUrl: sourceItems.canonicalUrl,
      sourceName: sources.name,
    })
    .from(cards)
    .innerJoin(cardSources, eq(cardSources.cardId, cards.id))
    .innerJoin(sourceItems, eq(sourceItems.id, cardSources.sourceItemId))
    .innerJoin(sources, eq(sources.id, sourceItems.sourceId))
    .where(
      and(
        eq(cards.id, id),
        eq(cardSources.isPrimary, true),
        ne(cards.reviewStatus, "hidden"),
        isNull(cards.mergedIntoCardId),
      ),
    )
    .limit(1);

  if (!item) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link className="text-sm underline" href="/cards">
        카드 목록
      </Link>
      <article className="mt-6 rounded-2xl border border-neutral-200 bg-white p-8">
        <p className="text-sm text-neutral-500">{item.sourceName}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">{item.title}</h1>
        <dl className="mt-6 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-neutral-900">발표일</dt>
            <dd>{dateFormatter.format(item.publishedAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-900">수집일</dt>
            <dd>{dateFormatter.format(item.collectedAt)}</dd>
          </div>
        </dl>
        <p className="mt-8 whitespace-pre-wrap text-base leading-8 text-neutral-800">
          {item.bodyText || item.summary}
        </p>
        {item.bodyTruncated ? (
          <p className="mt-4 text-sm text-amber-700">
            저장 상한에 따라 본문 일부만 보관했습니다.
          </p>
        ) : null}
        {item.canonicalUrl ? (
          <a
            className="mt-8 inline-block text-sm underline"
            href={item.canonicalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            원문 보기
          </a>
        ) : null}
      </article>
    </main>
  );
}
