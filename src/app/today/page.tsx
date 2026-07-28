import { and, count, desc, eq, gte, isNull, ne } from "drizzle-orm";
import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import { requireActiveUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  cards,
  ingestionRuns,
  sourceItems,
  sources,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

function startOfTodayInSeoul(now = new Date()) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - KST_OFFSET_MS,
  );
}

export default async function TodayPage() {
  const user = await requireActiveUser();
  const todayStartedAt = startOfTodayInSeoul();
  const visibleCard = and(
    ne(cards.reviewStatus, "hidden"),
    isNull(cards.mergedIntoCardId),
  );

  const [latestCards, todayCountResult, lastSuccessfulRun] = await Promise.all([
    db
      .select({
        id: cards.id,
        title: cards.title,
        summary: cards.summary,
        publishedAt: cards.publishedAt,
        collectedAt: cards.collectedAt,
        reviewStatus: cards.reviewStatus,
        sectorTags: cards.sectorTags,
        sourceName: sources.name,
        sourceUrl: sourceItems.canonicalUrl,
      })
      .from(cards)
      .leftJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
      .leftJoin(sources, eq(sources.id, sourceItems.sourceId))
      .where(visibleCard)
      .orderBy(desc(cards.collectedAt), desc(cards.publishedAt))
      .limit(20),
    db
      .select({ value: count() })
      .from(cards)
      .where(and(visibleCard, gte(cards.collectedAt, todayStartedAt))),
    db
      .select({ finishedAt: ingestionRuns.finishedAt })
      .from(ingestionRuns)
      .where(eq(ingestionRuns.status, "success"))
      .orderBy(desc(ingestionRuns.finishedAt))
      .limit(1),
  ]);

  const todayCount = todayCountResult[0]?.value ?? 0;
  const todayCards = latestCards.filter(
    (card) => card.collectedAt >= todayStartedAt,
  );
  const displayedCards = todayCards.length > 0 ? todayCards : latestCards;
  const highlights = displayedCards.slice(0, 5);
  const isShowingArchive = todayCards.length === 0 && latestCards.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">오늘</p>
          <h1 className="mt-1 text-3xl font-semibold">주요 업데이트</h1>
        </div>
        <div className="flex items-center gap-3">
          {user.role === "admin" ? (
            <>
              <Link className="text-sm underline" href="/admin/ingestion">
                수집 상태
              </Link>
              <Link className="text-sm underline" href="/admin/users">
                사용자 관리
              </Link>
            </>
          ) : null}
          <Link className="text-sm underline" href="/cards">
            전체 카드
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">오늘 새 카드</p>
          <p className="mt-2 text-3xl font-semibold">{todayCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">주요 업데이트</p>
          <p className="mt-2 text-3xl font-semibold">{highlights.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">마지막 수집 성공</p>
          <p className="mt-3 text-sm font-medium">
            {lastSuccessfulRun[0]?.finishedAt
              ? dateTimeFormatter.format(lastSuccessfulRun[0].finishedAt)
              : "기록 없음"}
          </p>
        </div>
      </section>

      {isShowingArchive ? (
        <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          오늘 새로 들어온 카드는 없어 최근 아카이브를 표시합니다.
        </p>
      ) : null}

      {highlights.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium">아직 수집된 카드가 없습니다.</h2>
          <p className="mt-2 text-sm text-neutral-500">
            워커를 실행하면 최신 카드가 이 화면에 표시됩니다.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  {isShowingArchive ? "최근 아카이브" : "오늘"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">먼저 볼 업데이트</h2>
              </div>
              <Link className="text-sm underline" href="/cards">
                전체 보기
              </Link>
            </div>

            <ol className="mt-5 grid gap-4">
              {highlights.map((card, index) => (
                <li key={card.id}>
                  <Link
                    className="block rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400"
                    href={`/cards/${card.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="rounded-full bg-neutral-900 px-2 py-1 font-medium text-white">
                        {index === 0 ? "최신" : "새 신호"}
                      </span>
                      <time dateTime={card.publishedAt.toISOString()}>
                        {dateFormatter.format(card.publishedAt)}
                      </time>
                      {card.sourceName ? (
                        <>
                          <span>·</span>
                          <span>{card.sourceName}</span>
                        </>
                      ) : null}
                      {card.sectorTags.map((tag) => (
                        <span
                          className="rounded-full bg-neutral-100 px-2 py-1"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{card.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                      {card.summary}
                    </p>
                    <p className="mt-4 text-xs text-neutral-500">
                      {card.reviewStatus === "pending_review"
                        ? "관리자 검토 대기"
                        : "내부 공개"}
                      {card.sourceUrl ? " · 원문 연결됨" : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {displayedCards.length > highlights.length ? (
            <section className="mt-12">
              <h2 className="text-xl font-semibold">전체 업데이트</h2>
              <ul className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white px-5">
                {displayedCards.slice(5).map((card) => (
                  <li key={card.id}>
                    <Link
                      className="flex items-start justify-between gap-5 py-4"
                      href={`/cards/${card.id}`}
                    >
                      <span className="font-medium">{card.title}</span>
                      <time
                        className="shrink-0 text-xs text-neutral-500"
                        dateTime={card.publishedAt.toISOString()}
                      >
                        {dateFormatter.format(card.publishedAt)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
