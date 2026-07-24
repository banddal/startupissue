"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={signOut}
      className="text-xs text-soft border border-line rounded px-3 py-1.5 hover:bg-[#F0EFE7]"
    >
      로그아웃
    </button>
  );
}
