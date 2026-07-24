import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import UserRow from "@/components/UserRow";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin" || me?.status !== "active") redirect("/today");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, role, status, created_at")
    .order("created_at", { ascending: false });

  const list = (profiles ?? []) as Profile[];
  const pending = list.filter((p) => p.status === "pending");
  const others = list.filter((p) => p.status !== "pending");

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-line">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <h1 className="text-lg font-bold">사용자 관리</h1>
          <span className="flex-1" />
          <Link
            href="/today"
            className="text-xs text-soft border border-line rounded px-3 py-1.5 hover:bg-[#F0EFE7]"
          >
            오늘로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">
            승인 대기{" "}
            <span className="font-mono text-xs text-soft">{pending.length}</span>
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-soft">대기 중인 신청이 없습니다.</p>
          ) : (
            <div className="grid gap-2">
              {pending.map((p) => (
                <UserRow key={p.id} profile={p} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">전체 사용자</h2>
          <div className="grid gap-2">
            {others.map((p) => (
              <UserRow key={p.id} profile={p} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
