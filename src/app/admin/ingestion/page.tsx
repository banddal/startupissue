import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ingestionRuns, sources } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Seoul",
});

export default async function AdminIngestionPage() {
  await requireAdmin();

  const runs = await db
    .select({
      id: ingestionRuns.id,
      sourceName: sources.name,
      startedAt: ingestionRuns.startedAt,
      finishedAt: ingestionRuns.finishedAt,
      status: ingestionRuns.status,
      fetchedCount: ingestionRuns.fetchedCount,
      newCount: ingestionRuns.newCount,
      updatedCount: ingestionRuns.updatedCount,
      duplicateCount: ingestionRuns.duplicateCount,
      failedCount: ingestionRuns.failedCount,
      errorType: ingestionRuns.errorType,
      errorMessage: ingestionRuns.errorMessage,
    })
    .from(ingestionRuns)
    .innerJoin(sources, eq(sources.id, ingestionRuns.sourceId))
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(100);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">관리자</p>
          <h1 className="mt-1 text-3xl font-semibold">수집 실행 상태</h1>
        </div>
        <Link className="text-sm underline" href="/cards">
          카드 목록
        </Link>
      </header>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-4xl text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              {["소스", "시작", "상태", "수집", "신규", "갱신", "중복", "실패", "오류"].map(
                (label) => (
                  <th className="px-4 py-3 font-medium" key={label}>
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr className="border-b border-neutral-100 last:border-0" key={run.id}>
                <td className="px-4 py-3 font-medium">{run.sourceName}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {dateFormatter.format(run.startedAt)}
                </td>
                <td className="px-4 py-3">{run.status}</td>
                <td className="px-4 py-3">{run.fetchedCount}</td>
                <td className="px-4 py-3">{run.newCount}</td>
                <td className="px-4 py-3">{run.updatedCount}</td>
                <td className="px-4 py-3">{run.duplicateCount}</td>
                <td className="px-4 py-3">{run.failedCount}</td>
                <td className="max-w-xs px-4 py-3 text-red-700">
                  {[run.errorType, run.errorMessage].filter(Boolean).join(": ") || "—"}
                </td>
              </tr>
            ))}
            {runs.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-neutral-500" colSpan={9}>
                  아직 실행 기록이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
