import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LoginButton from "@/components/LoginButton";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "active") redirect("/today");
    redirect("/pending");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[11px] tracking-[0.18em] text-soft mb-2">
          STARTUP ISSUES
        </p>
        <h1 className="text-2xl font-bold mb-2">
          매일 아침, 오늘의 스타트업 이슈
        </h1>
        <p className="text-sm text-soft leading-relaxed mb-8">
          뉴스와 정부 공고를 모아두고, 중요한 것을 체크하고 묶어둡니다.
        </p>
        <LoginButton />
      </div>
    </main>
  );
}
