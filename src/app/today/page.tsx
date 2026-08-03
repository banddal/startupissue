import { and, count, desc, eq, gte, isNotNull, isNull, ne } from "drizzle-orm";
import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import { ImportantButton } from "@/components/important-button";
import { cardTimelineLabel, startOfTodayInSeoul } from "@/lib/card-timeline";
import {
  CARD_TYPE_LABELS,
  CARD_TYPE_STYLES,
  CARD_TYPES,
  isCardType,
} from "@/lib/card-types";
import { getEconomicIndicators } from "@/lib/economic-indicators";
import { getCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  cards,
  ingestionRuns,
  sourceItems,
  sources,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; important?: string; note?: string }>;
}) {
  const filters = await searchParams;
  const requestedType = filters.type;
  const selectedType = isCardType(requestedType) ? requestedType : undefined;
  const user = await getCurrentUser();
  const importantOnly = filters.important === "1";
  const noteOnly = filters.note === "1";
  const todayStartedAt = startOfTodayInSeoul();
  const visibleCard = and(
    ne(cards.reviewStatus, "hidden"),
    isNull(cards.mergedIntoCardId),
  );
  const filteredCard = and(
    visibleCard,
    selectedType ? eq(cards.type, selectedType) : undefined,
    importantOnly ? eq(cards.important, true) : undefined,
    noteOnly ? isNotNull(cards.note) : undefined,
  );

  const [latestCards, todayCountResult, lastRun, typeCountRows, economicIndicators] = await Promise.all([
    db
      .select({
        id: cards.id,
        title: cards.title,
        summary: cards.summary,
        type: cards.type,
        publishedAt: cards.publishedAt,
        collectedAt: cards.collectedAt,
        important: cards.important,
        note: cards.note,
        sourceName: sources.name,
        sourceUrl: sourceItems.canonicalUrl,
      })
      .from(cards)
      .leftJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
      .leftJoin(sources, eq(sources.id, sourceItems.sourceId))
      .where(filteredCard)
      .orderBy(desc(cards.publishedAt), desc(cards.collectedAt))
      .limit(20),
    db
      .select({ value: count() })
      .from(cards)
      .where(and(filteredCard, gte(cards.collectedAt, todayStartedAt))),
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
      .select({ type: cards.type, value: count() })
      .from(cards)
      .where(visibleCard)
      .groupBy(cards.type),
    getEconomicIndicators(),
  ]);

  const todayCards = latestCards.filter(
    (card) => card.collectedAt >= todayStartedAt,
  );
  const displayedCards = todayCards.length > 0 ? todayCards : latestCards;
  const isShowingArchive = todayCards.length === 0 && latestCards.length > 0;
  const typeCounts = new Map(
    typeCountRows.map((row) => [row.type, row.value]),
  );
  const filterHref = (input: {
    type?: typeof selectedType;
    important?: boolean;
    note?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (input.type) query.set("type", input.type);
    if (input.important) query.set("important", "1");
    if (input.note) query.set("note", "1");
    const value = query.toString();
    return value ? `/today?${value}` : "/today";
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">Startup Issues</p>
          <h1 className="mt-1 text-3xl font-semibold">오늘의 정보</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-3">
          {user?.role === "admin" ? (
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
            전체 자료
          </Link>
          {user ? <SignOutButton /> : null}
        </nav>
      </header>

      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-500">경제 현황</p>
            <h2 className="mt-1 text-2xl font-semibold">
              시장·거시지표
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              시장 지표는 15분, 거시지표는 공식 발표 주기로 갱신됩니다.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
            실제 데이터
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {economicIndicators.map((indicator) => {
            const changeClass =
              indicator.change === null
                ? "text-neutral-500"
                : indicator.change > 0
                  ? "text-red-600"
                  : indicator.change < 0
                    ? "text-blue-600"
                    : "text-neutral-500";
            return (
              <article className="rounded-xl bg-neutral-50 p-4" key={indicator.code}>
                <p className="text-xs font-medium text-neutral-500">{indicator.label}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">
                  {indicator.value === null
                    ? "수집 실패"
                    : `${indicator.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${indicator.unit}`}
                </p>
                {indicator.change !== null ? (
                  <p className={`mt-1 text-xs tabular-nums ${changeClass}`}>
                    전일대비 {indicator.change > 0 ? "+" : ""}
                    {indicator.change.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                    {indicator.changeUnit}
                  </p>
                ) : null}
                <p className="mt-3 text-[11px] text-neutral-500">
                  {indicator.observedLabel ?? "최신값 확인 불가"}
                </p>
                <a
                  className="mt-1 inline-block text-[11px] underline"
                  href={indicator.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  출처: {indicator.sourceLabel}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">오늘 새 자료</p>
          <p className="mt-2 text-3xl font-semibold">
            {todayCountResult[0]?.value ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">최근 수집</p>
          <p className="mt-2 text-base font-semibold">
            {lastRun[0]
              ? `${lastRun[0].sourceName} · ${lastRun[0].status}`
              : "기록 없음"}
          </p>
          {lastRun[0] ? (
            <p className="mt-2 text-xs text-neutral-500">
              {dateTimeFormatter.format(lastRun[0].startedAt)}
              {lastRun[0].failedCount > 0
                ? ` · 실패 ${lastRun[0].failedCount}건`
                : ""}
            </p>
          ) : null}
        </article>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARD_TYPES.map((type) => (
          <Link
            className={`rounded-xl border p-4 transition ${CARD_TYPE_STYLES[type].count}`}
            href={`/today?type=${type}`}
            key={type}
          >
            <p className="text-sm text-neutral-500">{CARD_TYPE_LABELS[type]}</p>
            <p className="mt-1 text-2xl font-semibold">{typeCounts.get(type) ?? 0}</p>
          </Link>
        ))}
      </section>

      {isShowingArchive ? (
        <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          오늘 새 자료가 없어 최근 수집 자료를 표시합니다.
        </p>
      ) : null}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-500">
              {isShowingArchive ? "최근 자료" : "오늘"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              기업·기술·정책·투자 정보
            </h2>
          </div>
          <Link className="text-sm underline" href="/cards">
            전체 보기
          </Link>
        </div>

        <nav
          aria-label="정보 유형"
          className="mt-5 flex flex-wrap gap-2"
        >
          <Link
            className={`rounded-full px-4 py-2 text-sm ${
              selectedType
                ? "bg-white text-neutral-700 ring-1 ring-neutral-200"
                : "bg-neutral-900 text-white"
            }`}
            href={filterHref({ important: importantOnly, note: noteOnly })}
          >
            전체
          </Link>
          {CARD_TYPES.map((type) => (
            <Link
              className={`rounded-full px-4 py-2 text-sm ${
                selectedType === type
                  ? CARD_TYPE_STYLES[type].filterActive
                  : CARD_TYPE_STYLES[type].filter
              }`}
              href={filterHref({ type, important: importantOnly, note: noteOnly })}
              key={type}
            >
              {CARD_TYPE_LABELS[type]}
            </Link>
          ))}
          <Link
            className={`rounded-full px-4 py-2 text-sm ${
              importantOnly
                ? "bg-amber-400 text-amber-950"
                : "bg-white text-neutral-700 ring-1 ring-neutral-200"
            }`}
            href={filterHref({ type: selectedType, important: !importantOnly, note: noteOnly })}
          >
            ★ 중요만
          </Link>
          <Link
            className={`rounded-full px-4 py-2 text-sm ${
              noteOnly
                ? "bg-emerald-500 text-white"
                : "bg-white text-neutral-700 ring-1 ring-neutral-200"
            }`}
            href={filterHref({ type: selectedType, important: importantOnly, note: !noteOnly })}
          >
            메모 있음
          </Link>
        </nav>

        {displayedCards.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <h3 className="text-lg font-medium">아직 수집된 자료가 없습니다.</h3>
            <p className="mt-2 text-sm text-neutral-500">
              수집이 완료되면 최신 자료가 이 화면에 표시됩니다.
            </p>
          </div>
        ) : (
          <ol className="mt-5 grid gap-4">
            {displayedCards.map((card) => (
              <li key={card.id}>
                <article className={`rounded-2xl border p-6 transition ${CARD_TYPE_STYLES[card.type].card}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800">
                        {cardTimelineLabel(card.collectedAt)}
                      </span>
                      <span className={`rounded-full px-2 py-1 font-medium ${CARD_TYPE_STYLES[card.type].badge}`}>
                        {CARD_TYPE_LABELS[card.type]}
                      </span>
                      {card.sourceName ? <span>{card.sourceName}</span> : null}
                      {card.note ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                          메모 있음
                        </span>
                      ) : null}
                    </div>
                    <ImportantButton cardId={card.id} important={card.important} />
                  </div>
                  <Link className="block" href={`/cards/${card.id}`}>
                    <h3 className="mt-3 text-xl font-semibold">{card.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                      {card.summary}
                    </p>
                    <p className="mt-4 text-xs text-neutral-500">
                      발표 {dateTimeFormatter.format(card.publishedAt)} · 수집{" "}
                      {dateTimeFormatter.format(card.collectedAt)}
                      {card.sourceUrl ? " · 원문 연결됨" : ""}
                    </p>
                  </Link>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
