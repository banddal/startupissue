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

const statusLabels: Record<string, string> = {
  running: "실행 중",
  success: "정상 완료",
  partial: "일부 실패",
  failed: "실패",
};

function readableError(errorType: string | null, errorMessage: string | null) {
  if (!errorType && !errorMessage) return "—";
  const message = errorMessage ?? "원인을 확인하지 못했습니다.";

  if (message.startsWith("Failed query:")) {
    return "데이터 저장 중 오류가 발생했습니다. 상세 내용은 서버 로그에서 확인하세요.";
  }

  return `${errorType ? `${errorType}: ` : ""}${message}`.slice(0, 300);
}

export default async function AdminIngestionPage() {
  await requireAdmin();

  const runs = await db
    .select({
      id: ingestionRuns.id,
      sourceName: sources.name,
      startedAt: ingestionRuns.startedAt,
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

  // This dynamic server page evaluates the operational window once per request.
  // eslint-disable-next-line react-hooks/purity
  const recentBoundary = Date.now() - 24 * 60 * 60 * 1000;
  const recentRuns = runs.filter((run) => run.startedAt.getTime() >= recentBoundary);
  const recentFailedItems = recentRuns.reduce((total, run) => total + run.failedCount, 0);
  const healthyRuns = recentRuns.filter((run) => run.status === "success").length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">관리자</p>
          <h1 className="mt-1 text-3xl font-semibold">수집 실행 상태</h1>
        </div>
        <Link className="text-sm underline" href="/cards">카드 목록</Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Summary label="최근 24시간 실행" value={recentRuns.length} />
        <Summary label="정상 완료" value={healthyRuns} />
        <Summary label="실패 항목" value={recentFailedItems} />
      </section>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-4xl text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              {["소스", "시작", "상태", "수집", "신규", "갱신", "중복", "실패", "오류"].map((label) => (
                <th className="px-4 py-3 font-medium" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr className="border-b border-neutral-100 last:border-0" key={run.id}>
                <td className="px-4 py-3 font-medium">{run.sourceName}</td>
                <td className="whitespace-nowrap px-4 py-3">{dateFormatter.format(run.startedAt)}</td>
                <td className="whitespace-nowrap px-4 py-3">{statusLabels[run.status] ?? run.status}</td>
                <td className="px-4 py-3">{run.fetchedCount}</td>
                <td className="px-4 py-3">{run.newCount}</td>
                <td className="px-4 py-3">{run.updatedCount}</td>
                <td className="px-4 py-3">{run.duplicateCount}</td>
                <td className="px-4 py-3">{run.failedCount}</td>
                <td className="max-w-xs break-words px-4 py-3 text-red-700">
                  {readableError(run.errorType, run.errorMessage)}
                </td>
              </tr>
            ))}
            {runs.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-neutral-500" colSpan={9}>아직 실행 기록이 없습니다.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
