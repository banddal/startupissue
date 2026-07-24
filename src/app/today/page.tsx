import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";

export default async function TodayPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");

  const { data: cards } = await supabase
    .from("cards")
    .select("id, title, summary, published_on, source_key, score")
    .eq("hidden", false)
    .order("published_on", { ascending: false })
    .limit(30);

  const today = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-line">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] tracking-[0.16em] text-soft">
            STARTUP ISSUES
          </span>
          <h1 className="text-lg font-bold">오늘</h1>
          <span className="text-xs text-soft">{today}</span>
          <span className="flex-1" />
          {profile.role === "admin" && (
            <Link
              href="/admin/users"
              className="text-xs text-soft border border-line rounded px-3 py-1.5 hover:bg-[#F0EFE7]"
            >
              사용자 관리
            </Link>
          )}
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        {!cards || cards.length === 0 ? (
          <div className="bg-white border border-line rounded-md p-10 text-center">
            <p className="text-sm text-soft leading-relaxed">
              아직 수집된 카드가 없습니다.
              <br />
              다음 라운드에서 뉴스와 공고 수집이 연결됩니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {cards.map((c) => (
              <article
                key={c.id}
                className="bg-white border border-line rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] text-soft">
                    {c.source_key}
                  </span>
                  <span className="font-mono text-[10px] text-soft">
                    {c.published_on}
                  </span>
                </div>
                <h2 className="text-[15px] font-semibold leading-snug mb-1">
                  {c.title}
                </h2>
                {c.summary && (
                  <p className="text-[13px] text-[#3c4038] leading-relaxed">
                    {c.summary}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
