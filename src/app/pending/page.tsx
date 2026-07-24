import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth-buttons";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await requireUser();

  if (user.status === "active") {
    redirect("/today");
  }

  const messages = {
    pending: "관리자 승인 후 아카이브를 이용할 수 있습니다.",
    rejected: "가입 요청이 승인되지 않았습니다.",
    suspended: "현재 계정의 접근이 중지되었습니다.",
  } as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-8">
        <p className="text-sm font-medium text-neutral-500">계정 상태</p>
        <h1 className="mt-2 text-2xl font-semibold">{user.status}</h1>
        <p className="mt-4 text-neutral-600">
          {messages[user.status as keyof typeof messages]}
        </p>
        <p className="mt-2 text-sm text-neutral-500">{user.email}</p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
