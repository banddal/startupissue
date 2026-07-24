import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInButton } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  if (session?.user.status === "active") {
    redirect("/today");
  }

  if (session?.user) {
    redirect("/pending");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="max-w-xl">
        <p className="mb-3 text-sm font-medium text-neutral-500">
          STARTUP INTELLIGENCE ARCHIVE
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          오늘의 변화를 놓치지 않고,
          <br />
          어제의 정보를 잃지 않습니다.
        </h1>
        <p className="mt-5 leading-7 text-neutral-600">
          승인된 내부 사용자를 위한 스타트업 뉴스·정책 아카이브입니다.
        </p>
        <div className="mt-8">
          <SignInButton />
        </div>
      </section>
    </main>
  );
}
