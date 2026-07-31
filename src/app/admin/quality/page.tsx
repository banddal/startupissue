import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import Link from "next/link";

import { CardQualityForm } from "@/components/card-quality-form";
import { qualityRate } from "@/lib/card-quality";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  cards,
  cardQualityReviews,
  sourceItems,
  sources,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default async function AdminQualityPage() {
  const admin = await requireAdmin();
  const [sample, reviews] = await Promise.all([
    db
      .select({
        id: cards.id,
        title: cards.title,
        summary: cards.summary,
        publishedAt: cards.publishedAt,
        score: cards.informationValueScore,
        reason: cards.informationValueReason,
        ruleVersion: cards.informationValueRuleVersion,
        sourceName: sources.name,
      })
      .from(cards)
      .leftJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
      .leftJoin(sources, eq(sources.id, sourceItems.sourceId))
      .where(
        and(
          ne(cards.reviewStatus, "hidden"),
          isNull(cards.mergedIntoCardId),
        ),
      )
      .orderBy(
        sql`${cards.informationValueScore} desc nulls last`,
        desc(cards.publishedAt),
      )
      .limit(50),
    db
      .select()
      .from(cardQualityReviews)
      .where(eq(cardQualityReviews.reviewerId, admin.id)),
  ]);

  const reviewByCard = new Map(reviews.map((review) => [review.cardId, review]));
  const sampledReviews = sample
    .map((card) => reviewByCard.get(card.id))
    .filter((review) => review !== undefined);
  const rate = qualityRate(sampledReviews.map((review) => review.verdict));
  const decidedCount = sampledReviews.filter(
    (review) => review.verdict !== "unsure",
  ).length;
  const unsureCount = sampledReviews.length - decidedCount;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">관리자</p>
          <h1 className="mt-1 text-3xl font-semibold">정보가치 표본 평가</h1>
        </div>
        <Link className="text-sm underline" href="/today">
          오늘로 돌아가기
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">결정 평가</p>
          <p className="mt-2 text-3xl font-semibold">{decidedCount}</p>
          <p className="mt-2 text-xs text-neutral-500">목표 표본 50건</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">보류</p>
          <p className="mt-2 text-3xl font-semibold">{unsureCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">볼 가치 있음</p>
          <p className="mt-2 text-3xl font-semibold">
            {rate === null ? "미측정" : `${Math.round(rate * 100)}%`}
          </p>
          <p className="mt-2 text-xs text-neutral-500">통과 기준 70%</p>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        {sample.map((card, index) => {
          const review = reviewByCard.get(card.id);
          return (
            <article
              className="rounded-2xl border border-neutral-200 bg-white p-6"
              key={card.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>표본 {index + 1}</span>
                <span>·</span>
                <span>점수 {card.score ?? "미평가"}</span>
                <span>·</span>
                <span>{card.sourceName ?? "출처 미상"}</span>
                <span>·</span>
                <time dateTime={card.publishedAt.toISOString()}>
                  {dateFormatter.format(card.publishedAt)}
                </time>
              </div>
              <Link href={`/cards/${card.id}`}>
                <h2 className="mt-2 text-xl font-semibold hover:underline">
                  {card.title}
                </h2>
              </Link>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                {card.summary}
              </p>
              {card.reason ? (
                <p className="mt-3 text-sm font-medium">
                  평가 근거: {card.reason}
                </p>
              ) : null}
              <CardQualityForm
                cardId={card.id}
                currentNote={review?.note}
                currentVerdict={review?.verdict}
                ruleVersion={card.ruleVersion}
                score={card.score}
              />
            </article>
          );
        })}
      </section>
    </main>
  );
}
