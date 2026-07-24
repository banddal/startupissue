"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const signIn = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="w-full border border-ink bg-ink text-white rounded px-4 py-2.5 text-sm font-semibold hover:bg-[#3a3f34] disabled:opacity-50"
    >
      {loading ? "이동 중…" : "Google로 계속하기"}
    </button>
  );
}
