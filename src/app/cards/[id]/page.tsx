import { and, eq, isNull, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import {
  cards,
  cardSources,
  cardUserStates,
  sourceItems,
  sources,
} from "@/server/db/schema";
import { CARD_TYPE_LABELS, CARD_TYPES } from "@/lib/card-types";
import { cardTimelineLabel } from "@/lib/card-timeline";
import { ImportantButton } from "@/components/important-button";
import { getCurrentUser } from "@/server/auth/guards";
import { updateCardType } from "./actions";

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
  const { id } = await params;
  const user = await getCurrentUser();

  const [item] = await db
    .select({
      id: cards.id,
      title: cards.title,
      summary: cards.summary,
      type: cards.type,
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
  const [userState] = user?.status === "active"
    ? await db
        .select({ important: cardUserStates.important })
        .from(cardUserStates)
        .where(
          and(
            eq(cardUserStates.userId, user.id),
            eq(cardUserStates.cardId, item.id),
          ),
        )
        .limit(1)
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link className="text-sm underline" href="/cards">
        카드 목록
      </Link>
      <article className="mt-6 rounded-2xl border border-neutral-200 bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {cardTimelineLabel(item.collectedAt)}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-1 font-medium text-neutral-700">
              {CARD_TYPE_LABELS[item.type]}
            </span>
            <span>{item.sourceName}</span>
          </div>
          {user?.status === "active" ? (
            <ImportantButton
              cardId={item.id}
              important={userState?.important ?? false}
            />
          ) : null}
        </div>
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
        {user?.role === "admin" ? (
          <form
            action={updateCardType}
            className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl bg-neutral-50 p-4"
          >
            <input name="cardId" type="hidden" value={item.id} />
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-neutral-900">정보 유형</span>
              <select
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2"
                defaultValue={item.type}
                name="type"
              >
                {CARD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CARD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              type="submit"
            >
              유형 저장
            </button>
          </form>
        ) : null}
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
