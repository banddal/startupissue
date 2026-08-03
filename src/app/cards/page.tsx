import { and, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";
import Link from "next/link";

import { ImportantButton } from "@/components/important-button";
import { cardTimelineLabel } from "@/lib/card-timeline";
import {
  CARD_TYPE_LABELS,
  CARD_TYPE_STYLES,
  CARD_TYPES,
  isCardType,
} from "@/lib/card-types";
import { db } from "@/server/db";
import {
  cards,
  sourceItems,
  sources,
} from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; important?: string; note?: string }>;
}) {
  const filters = await searchParams;
  const requestedType = filters.type;
  const selectedType = isCardType(requestedType) ? requestedType : undefined;
  const importantOnly = filters.important === "1";
  const noteOnly = filters.note === "1";
  const items = await db
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
    })
    .from(cards)
    .leftJoin(sourceItems, eq(sourceItems.id, cards.primarySourceItemId))
    .leftJoin(sources, eq(sources.id, sourceItems.sourceId))
    .where(
      and(
        ne(cards.reviewStatus, "hidden"),
        isNull(cards.mergedIntoCardId),
        selectedType ? eq(cards.type, selectedType) : undefined,
        importantOnly ? eq(cards.important, true) : undefined,
        noteOnly ? isNotNull(cards.note) : undefined,
      ),
    )
    .orderBy(desc(cards.publishedAt))
    .limit(100);
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
    return value ? `/cards?${value}` : "/cards";
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">아카이브</p>
          <h1 className="mt-1 text-3xl font-semibold">전체 자료</h1>
        </div>
        <Link className="text-sm underline" href="/today">
          오늘로 돌아가기
        </Link>
      </header>

      <nav aria-label="정보 유형" className="mt-8 flex flex-wrap gap-2">
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
          className={`rounded-full px-4 py-2 text-sm ${importantOnly ? "bg-amber-400 text-amber-950" : "bg-white text-neutral-700 ring-1 ring-neutral-200"}`}
          href={filterHref({ type: selectedType, important: !importantOnly, note: noteOnly })}
        >
          ★ 중요만
        </Link>
        <Link
          className={`rounded-full px-4 py-2 text-sm ${noteOnly ? "bg-emerald-500 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"}`}
          href={filterHref({ type: selectedType, important: importantOnly, note: !noteOnly })}
        >
          메모 있음
        </Link>
      </nav>

      {items.length === 0 ? (
        <section className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium">아직 수집된 카드가 없습니다.</h2>
          <p className="mt-2 text-sm text-neutral-500">
            워커를 실행하면 발표일이 최신인 카드부터 표시됩니다.
          </p>
        </section>
      ) : (
        <ul className="mt-8 grid gap-4">
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
                      <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                        메모 있음
                      </span>
                    ) : null}
                  </div>
                  <ImportantButton cardId={item.id} important={item.important} />
                </div>
                <Link className="block" href={`/cards/${item.id}`}>
                  <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                    {item.summary}
                  </p>
                  <p className="mt-4 text-xs text-neutral-500">
                    발표 {dateTimeFormatter.format(item.publishedAt)} · 수집{" "}
                    {dateTimeFormatter.format(item.collectedAt)}
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
