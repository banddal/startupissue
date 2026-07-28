import { and, desc, isNull, ne } from "drizzle-orm";
import Link from "next/link";

import { requireActiveUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { cards } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default async function CardsPage() {
  await requireActiveUser();

  const items = await db
    .select({
      id: cards.id,
      title: cards.title,
      summary: cards.summary,
      publishedAt: cards.publishedAt,
      reviewStatus: cards.reviewStatus,
      sectorTags: cards.sectorTags,
    })
    .from(cards)
    .where(and(ne(cards.reviewStatus, "hidden"), isNull(cards.mergedIntoCardId)))
    .orderBy(desc(cards.publishedAt))
    .limit(100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">Round 2</p>
          <h1 className="mt-1 text-3xl font-semibold">수집 카드</h1>
        </div>
        <Link className="text-sm underline" href="/today">
          오늘로 돌아가기
        </Link>
      </header>

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
                  <time dateTime={item.publishedAt.toISOString()}>
                    {dateFormatter.format(item.publishedAt)}
                  </time>
                  <span>·</span>
                  <span>{item.reviewStatus}</span>
                  {item.sectorTags.map((tag) => (
                    <span
                      className="rounded-full bg-neutral-100 px-2 py-1"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
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
