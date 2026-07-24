import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, email")
    .eq("id", user.id)
    .single();

  if (profile?.status === "active") redirect("/today");

  const rejected = profile?.status === "rejected" || profile?.status === "suspended";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-lg font-bold mb-3">
          {rejected ? "접근이 허용되지 않았습니다" : "승인 대기 중입니다"}
        </h1>
        <p className="text-sm text-soft leading-relaxed mb-2">
          {rejected
            ? "관리자에게 문의해 주세요."
            : "관리자가 승인하면 바로 이용할 수 있습니다."}
        </p>
        <p className="font-mono text-xs text-soft mb-8">{profile?.email}</p>
        <SignOutButton />
      </div>
    </main>
  );
}
