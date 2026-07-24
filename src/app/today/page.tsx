import Link from "next/link";

import { SignOutButton } from "@/components/auth-buttons";
import { requireActiveUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await requireActiveUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">오늘</p>
          <h1 className="mt-1 text-3xl font-semibold">주요 업데이트</h1>
        </div>
        <div className="flex items-center gap-3">
          {user.role === "admin" ? (
            <Link className="text-sm underline" href="/admin/users">
              사용자 관리
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </header>

      <section className="mt-12 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
        <h2 className="text-lg font-medium">아직 수집된 카드가 없습니다.</h2>
        <p className="mt-2 text-sm text-neutral-500">
          다음 라운드에서 첫 RSS 수집 파이프라인을 연결합니다.
        </p>
      </section>
    </main>
  );
}
