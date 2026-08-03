import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import Link from "next/link";

import { SignInButton } from "@/components/auth-buttons";
import { ImportantButton } from "@/components/important-button";
import { cardTimelineLabel } from "@/lib/card-timeline";
import {
  CARD_TYPE_LABELS,
  CARD_TYPE_STYLES,
  CARD_TYPES,
  isCardType,
} from "@/lib/card-types";
import { getCurrentUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  cards,
  cardUserStates,
  notes,
  sourceItems,
  sources,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

type CardsSearchParams = {
  q?: string;
  from?: string;
  to?: string;
  source?: string;
  type?: string;
  important?: string;
  note?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function koreanDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value || !datePattern.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+09:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<CardsSearchParams>;
}) {
  const filters = await searchParams;
  const query = filters.q?.trim().slice(0, 100) ?? "";
  const sourceKey = filters.source?.trim().slice(0, 100) ?? "";
  const fromValue = datePattern.test(filters.from ?? "") ? filters.from ?? "" : "";
  const toValue = datePattern.test(filters.to ?? "") ? filters.to ?? "" : "";
  const fromDate = koreanDateBoundary(fromValue);
  const toDate = koreanDateBoundary(toValue, true);
  const selectedType = isCardType(filters.type) ? filters.type : undefined;
  const user = await getCurrentUser();
  const importantOnly = Boolean(user) && filters.important === "1";
  const noteOnly = Boolean(user) && filters.note === "1";
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
  const searchPattern = query ? `%${escapeLike(query)}%` : undefined;

  const [sourceOptions, items] = await Promise.all([
    db
      .select({ key: sources.key, name: sources.name })
      .from(sources)
      .where(eq(sources.enabled, true))
      .orderBy(asc(sources.name)),
    db
      .select({
        id: cards.id,
        title: cards.title,
        summary: cards.summary,
        type: cards.type,
        publishedAt: cards.publishedAt,
        collectedAt: cards.collectedAt,
        important: sql<boolean>`coalesce(${cardUserStates.important}, false)`,
        note: notes.body,
        sourceName: sources.name,
        totalCount: sql<number>`count(*) over()`,
      })
      .from(cards)
      .leftJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
      .leftJoin(sources, eq(sources.id, sourceItems.sourceId))
      .leftJoin(
        cardUserStates,
        and(eq(cardUserStates.cardId, cards.id), eq(cardUserStates.userId, userId)),
      )
      .leftJoin(notes, and(eq(notes.cardId, cards.id), eq(notes.userId, userId)))
      .where(
        and(
          ne(cards.reviewStatus, "hidden"),
          isNull(cards.mergedIntoCardId),
          searchPattern
            ? or(ilike(cards.title, searchPattern), ilike(cards.summary, searchPattern))
            : undefined,
          sourceKey ? eq(sources.key, sourceKey) : undefined,
          selectedType ? eq(cards.type, selectedType) : undefined,
          fromDate ? gte(cards.publishedAt, fromDate) : undefined,
          toDate ? lte(cards.publishedAt, toDate) : undefined,
          importantOnly ? eq(cardUserStates.important, true) : undefined,
          noteOnly ? isNotNull(notes.body) : undefined,
        ),
      )
      .orderBy(desc(cards.publishedAt))
      .limit(100),
  ]);

  const totalCount = Number(items[0]?.totalCount ?? 0);
  const filterHref = (overrides: Partial<CardsSearchParams>) => {
    const next: CardsSearchParams = {
      q: query || undefined,
      from: fromValue || undefined,
      to: toValue || undefined,
      source: sourceKey || undefined,
      type: selectedType,
      important: importantOnly ? "1" : undefined,
      note: noteOnly ? "1" : undefined,
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const value = params.toString();
    return value ? `/cards?${value}` : "/cards";
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">아카이브</p>
          <h1 className="mt-1 text-3xl font-semibold">전체 자료</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link className="text-sm underline" href="/today">오늘로 돌아가기</Link>
          {!user ? <SignInButton /> : null}
        </div>
      </header>

      <form className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5" method="get">
        {selectedType ? <input name="type" type="hidden" value={selectedType} /> : null}
        {importantOnly ? <input name="important" type="hidden" value="1" /> : null}
        {noteOnly ? <input name="note" type="hidden" value="1" /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-neutral-700">
            검색어
            <input
              className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-2.5 font-normal"
              defaultValue={query}
              maxLength={100}
              name="q"
              placeholder="제목·요약 검색"
              type="search"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            출처
            <select
              className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 font-normal"
              defaultValue={sourceKey}
              name="source"
            >
              <option value="">전체 출처</option>
              {sourceOptions.map((source) => (
                <option key={source.key} value={source.key}>{source.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700">
            시작일
            <input
              className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-2.5 font-normal"
              defaultValue={fromValue}
              name="from"
              type="date"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            종료일
            <input
              className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-2.5 font-normal"
              defaultValue={toValue}
              name="to"
              type="date"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white" type="submit">
            검색
          </button>
          <Link className="rounded-full px-5 py-2.5 text-sm text-neutral-600 ring-1 ring-neutral-300" href="/cards">
            필터 초기화
          </Link>
        </div>
      </form>

      <nav aria-label="정보 유형" className="mt-6 flex flex-wrap gap-2">
        <Link
          className={`rounded-full px-4 py-2 text-sm ${selectedType ? "bg-white text-neutral-700 ring-1 ring-neutral-200" : "bg-neutral-900 text-white"}`}
          href={filterHref({ type: undefined })}
        >
          전체
        </Link>
        {CARD_TYPES.map((type) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm ${selectedType === type ? CARD_TYPE_STYLES[type].filterActive : CARD_TYPE_STYLES[type].filter}`}
            href={filterHref({ type })}
            key={type}
          >
            {CARD_TYPE_LABELS[type]}
          </Link>
        ))}
        {user ? (
          <>
            <Link
              className={`rounded-full px-4 py-2 text-sm ${importantOnly ? "bg-amber-400 text-amber-950" : "bg-white text-neutral-700 ring-1 ring-neutral-200"}`}
              href={filterHref({ important: importantOnly ? undefined : "1" })}
            >
              중요만
            </Link>
            <Link
              className={`rounded-full px-4 py-2 text-sm ${noteOnly ? "bg-emerald-500 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"}`}
              href={filterHref({ note: noteOnly ? undefined : "1" })}
            >
              메모 있음
            </Link>
          </>
        ) : null}
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
        <p>검색 결과 {totalCount.toLocaleString("ko-KR")}건</p>
        {totalCount > items.length ? <p>최신 {items.length}건 표시</p> : null}
      </div>

      {items.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium">조건에 맞는 자료가 없습니다.</h2>
          <p className="mt-2 text-sm text-neutral-500">검색어나 필터를 조정해 다시 확인해 주세요.</p>
        </section>
      ) : (
        <ul className="mt-4 grid gap-4">
          {items.map((item) => (
            <li key={item.id}>
              <article className={`rounded-2xl border p-6 transition ${CARD_TYPE_STYLES[item.type].card}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800">
                      {cardTimelineLabel(item.collectedAt)}
                    </span>
                    <span className={`rounded-full px-2 py-1 font-medium ${CARD_TYPE_STYLES[item.type].badge}`}>
                      {CARD_TYPE_LABELS[item.type]}
                    </span>
                    {item.sourceName ? <span>{item.sourceName}</span> : null}
                    {item.note ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-800">메모 있음</span>
                    ) : null}
                  </div>
                  {user ? <ImportantButton cardId={item.id} important={item.important} /> : null}
                </div>
                <Link className="block" href={`/cards/${item.id}`}>
                  <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">{item.summary}</p>
                  <p className="mt-4 text-xs text-neutral-500">
                    발표 {dateTimeFormatter.format(item.publishedAt)} · 수집 {dateTimeFormatter.format(item.collectedAt)}
                  </p>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
