import { and, desc, eq, isNull, ne } from "drizzle-orm";
import Link from "next/link";

import {
  CARD_TYPE_LABELS,
  CARD_TYPES,
  isCardType,
} from "@/lib/card-types";
import { db } from "@/server/db";
import { cards } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const requestedType = (await searchParams).type;
  const selectedType = isCardType(requestedType) ? requestedType : undefined;
  const items = await db
    .select({
      id: cards.id,
      title: cards.title,
      summary: cards.summary,
      type: cards.type,
      publishedAt: cards.publishedAt,
    })
    .from(cards)
    .where(
      and(
        ne(cards.reviewStatus, "hidden"),
        isNull(cards.mergedIntoCardId),
        selectedType ? eq(cards.type, selectedType) : undefined,
      ),
    )
    .orderBy(desc(cards.publishedAt))
    .limit(100);

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
          href="/cards"
        >
          전체
        </Link>
        {CARD_TYPES.map((type) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm ${
              selectedType === type
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-700 ring-1 ring-neutral-200"
            }`}
            href={`/cards?type=${type}`}
            key={type}
          >
            {CARD_TYPE_LABELS[type]}
          </Link>
        ))}
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
              <Link
                className="block rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400"
                href={`/cards/${item.id}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded-full bg-neutral-100 px-2 py-1 font-medium text-neutral-700">
                    {CARD_TYPE_LABELS[item.type]}
                  </span>
                  <time dateTime={item.publishedAt.toISOString()}>
                    {dateFormatter.format(item.publishedAt)}
                  </time>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {item.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
