import { redirect } from "next/navigation";

import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { getCurrentUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user?.status === "active") redirect("/today");
  if (user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
        <section className="w-full rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-sm font-medium text-neutral-500">Startup Issues</p>
          <h1 className="mt-2 text-3xl font-semibold">사용자 승인 대기</h1>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            관리자가 계정을 승인하면 중요 체크와 개인 메모를 사용할 수 있습니다.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-8">
        <p className="text-sm font-medium text-neutral-500">Startup Issues</p>
        <h1 className="mt-2 text-3xl font-semibold">
          기업·기술·정책·투자 모니터링
        </h1>
        <p className="mt-4 text-sm leading-6 text-neutral-600">
          로그인하면 카드의 중요 체크와 개인 메모를 저장하고 다시 찾을 수 있습니다.
        </p>
        <div className="mt-6">
          <SignInButton />
        </div>
        <a className="mt-5 inline-block text-sm underline" href="/today">
          공개 자료 먼저 보기
        </a>
      </section>
    </main>
  );
}
