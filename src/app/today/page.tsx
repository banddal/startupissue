import { and, asc, count, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import { getCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  cards,
  companies,
  indicators,
  indicatorValues,
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

const badgeLabels = {
  major_change: "주요 변화",
  new_signal: "새 신호",
  follow_up: "후속 업데이트",
  reference: "참고",
} as const;

export default async function TodayPage() {
  const user = await getCurrentUser();
  const todayStartedAt = startOfTodayInSeoul();
  const visibleCard = and(
    ne(cards.reviewStatus, "hidden"),
    isNull(cards.mergedIntoCardId),
  );

  const [
    latestCards,
    todayCountResult,
    majorCountResult,
    pendingReviewResult,
    companyCandidateResult,
    lastSuccessfulRun,
    lastRun,
    indicatorRows,
  ] = await Promise.all([
    db
      .select({
        id: cards.id,
        title: cards.title,
        summary: cards.summary,
        publishedAt: cards.publishedAt,
        collectedAt: cards.collectedAt,
        reviewStatus: cards.reviewStatus,
        sectorTags: cards.sectorTags,
        informationValueScore: cards.informationValueScore,
        informationValueReason: cards.informationValueReason,
        informationValueBadge: cards.informationValueBadge,
        sourceName: sources.name,
        sourceUrl: sourceItems.canonicalUrl,
      })
      .from(cards)
      .leftJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
      .leftJoin(sources, eq(sources.id, sourceItems.sourceId))
      .where(visibleCard)
      .orderBy(
        sql`${cards.informationValueScore} desc nulls last`,
        desc(cards.publishedAt),
        desc(cards.collectedAt),
      )
      .limit(20),
    db
      .select({ value: count() })
      .from(cards)
      .where(and(visibleCard, gte(cards.collectedAt, todayStartedAt))),
    db
      .select({ value: count() })
      .from(cards)
      .where(
        and(
          visibleCard,
          gte(cards.collectedAt, todayStartedAt),
          gte(cards.informationValueScore, 4),
        ),
      ),
    db
      .select({ value: count() })
      .from(cards)
      .where(
        and(
          visibleCard,
          eq(cards.reviewStatus, "pending_review"),
        ),
      ),
    db
      .select({ value: count() })
      .from(companies)
      .where(eq(companies.status, "candidate")),
    db
      .select({ finishedAt: ingestionRuns.finishedAt })
      .from(ingestionRuns)
      .where(eq(ingestionRuns.status, "success"))
      .orderBy(desc(ingestionRuns.finishedAt))
      .limit(1),
    db
      .select({
        status: ingestionRuns.status,
        startedAt: ingestionRuns.startedAt,
        failedCount: ingestionRuns.failedCount,
        sourceName: sources.name,
      })
      .from(ingestionRuns)
      .innerJoin(sources, eq(sources.id, ingestionRuns.sourceId))
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(1),
    db
      .select({
        id: indicators.id,
        code: indicators.code,
        name: indicators.name,
        unit: indicators.unit,
        cadence: indicators.cadence,
        period: indicatorValues.period,
        value: indicatorValues.value,
        changeValue: indicatorValues.changeValue,
        status: indicatorValues.status,
        observedAt: indicatorValues.observedAt,
      })
      .from(indicators)
      .leftJoin(indicatorValues, eq(indicatorValues.indicatorId, indicators.id))
      .where(
        and(
          eq(indicators.active, true),
          eq(indicators.group, "ecosystem"),
        ),
      )
      .orderBy(
        asc(indicators.displayOrder),
        desc(indicatorValues.periodEnd),
      ),
  ]);

  const todayCount = todayCountResult[0]?.value ?? 0;
  const majorCount = majorCountResult[0]?.value ?? 0;
  const pendingReviewCount = pendingReviewResult[0]?.value ?? 0;
  const companyCandidateCount = companyCandidateResult[0]?.value ?? 0;
  const todayCards = latestCards.filter(
    (card) => card.collectedAt >= todayStartedAt,
  );
  const displayedCards = todayCards.length > 0 ? todayCards : latestCards;
  const highlights = displayedCards.slice(0, 5);
  const isShowingArchive = todayCards.length === 0 && latestCards.length > 0;
  const latestIndicatorById = new Map<
    string,
    (typeof indicatorRows)[number]
  >();
  for (const row of indicatorRows) {
    if (!latestIndicatorById.has(row.id)) latestIndicatorById.set(row.id, row);
  }
  const dashboardIndicators = [...latestIndicatorById.values()];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">오늘</p>
          <h1 className="mt-1 text-3xl font-semibold">주요 업데이트</h1>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === "admin" ? (
            <>
              <Link className="text-sm underline" href="/admin/ingestion">
                수집 상태
              </Link>
              <Link className="text-sm underline" href="/admin/users">
                사용자 관리
              </Link>
              <Link className="text-sm underline" href="/admin/companies">
                기업 명부
              </Link>
              <Link className="text-sm underline" href="/admin/quality">
                품질 평가
              </Link>
            </>
          ) : null}
          <Link className="text-sm underline" href="/cards">
            전체 카드
          </Link>
          <Link className="text-sm underline" href="/papers">
            논문
          </Link>
          {user ? <SignOutButton /> : null}
        </div>
      </header>

      <section className="mt-10">
        <div>
          <p className="text-sm font-medium text-neutral-500">상황판 v1</p>
          <h2 className="mt-1 text-2xl font-semibold">생태계 현황</h2>
          <p className="mt-2 text-sm text-neutral-500">
            지표 산출 기준과 소스가 승인되면 현재값과 전기 대비 변화가 표시됩니다.
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardIndicators.map((indicator) => {
            const hasValue =
              indicator.status !== "unavailable" && indicator.value !== null;
            const change =
              indicator.changeValue === null
                ? null
                : Number(indicator.changeValue);
            return (
              <article
                className="rounded-2xl border border-neutral-200 bg-white p-5"
                key={indicator.id}
              >
                <p className="text-sm text-neutral-500">{indicator.name}</p>
                <p className="mt-2 text-3xl font-semibold">
                  {hasValue
                    ? `${Number(indicator.value).toLocaleString("ko-KR")} ${indicator.unit}`
                    : "데이터 없음"}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  {hasValue && change !== null
                    ? `전기 대비 ${change > 0 ? "+" : ""}${change.toLocaleString("ko-KR")} ${indicator.unit}`
                    : "전기 대비 미측정"}
                </p>
                <p className="mt-3 text-xs text-neutral-400">
                  {indicator.period
                    ? `${indicator.period} · ${indicator.cadence}`
                    : `수집 준비 중 · ${indicator.cadence}`}
                </p>
                {indicator.code === "ecosystem_new_papers" ? (
                  <Link
                    className="mt-4 inline-block text-xs font-medium underline"
                    href="/papers"
                  >
                    최신 논문 보기
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-12">
        <p className="text-sm font-medium text-neutral-500">아카이브 운영</p>
        <h2 className="mt-1 text-2xl font-semibold">오늘 수집 현황</h2>
      </div>
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">오늘 새 카드</p>
          <p className="mt-2 text-3xl font-semibold">{todayCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">주요 업데이트</p>
          <p className="mt-2 text-3xl font-semibold">{majorCount}</p>
          <p className="mt-2 text-xs text-neutral-500">정보가치 4점 이상</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">검토 대기</p>
          <p className="mt-2 text-3xl font-semibold">{pendingReviewCount}</p>
          <p className="mt-2 text-xs text-neutral-500">전체 공개 카드 기준</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">새 기업 후보</p>
          <p className="mt-2 text-3xl font-semibold">{companyCandidateCount}</p>
          <p className="mt-2 text-xs text-neutral-500">관리자 승인 대기</p>
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

      {lastRun[0] ? (
        <section
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
            lastRun[0].status === "success"
              ? "bg-emerald-50 text-emerald-900"
              : lastRun[0].status === "running"
                ? "bg-blue-50 text-blue-900"
                : "bg-amber-50 text-amber-900"
          }`}
        >
          <p>
            최근 수집: <strong>{lastRun[0].sourceName}</strong> ·{" "}
            {lastRun[0].status}
            {lastRun[0].failedCount > 0
              ? ` · 실패 ${lastRun[0].failedCount}건`
              : ""}
          </p>
          <time dateTime={lastRun[0].startedAt.toISOString()}>
            {dateTimeFormatter.format(lastRun[0].startedAt)}
          </time>
        </section>
      ) : null}

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
              {highlights.map((card) => (
                <li key={card.id}>
                  <Link
                    className="block rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400"
                    href={`/cards/${card.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="rounded-full bg-neutral-900 px-2 py-1 font-medium text-white">
                        {card.informationValueBadge
                          ? badgeLabels[card.informationValueBadge]
                          : "새 업데이트"}
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
                    {card.informationValueReason ? (
                      <p className="mt-3 text-sm font-medium text-neutral-700">
                        중요한 이유: {card.informationValueReason}
                      </p>
                    ) : null}
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
