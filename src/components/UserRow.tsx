"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { Profile } from "@/lib/types";

const STATUS_LABEL: Record<Profile["status"], string> = {
  pending: "대기",
  active: "활성",
  rejected: "거절",
  suspended: "정지",
};

export default function UserRow({ profile }: { profile: Profile }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const setStatus = async (status: Profile["status"]) => {
    setBusy(true);
    await supabase
      .from("profiles")
      .update({ status, approved_at: new Date().toISOString() })
      .eq("id", profile.id);
    setBusy(false);
    router.refresh();
  };

  const toggleRole = async () => {
    setBusy(true);
    await supabase
      .from("profiles")
      .update({ role: profile.role === "admin" ? "member" : "admin" })
      .eq("id", profile.id);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="bg-white border border-line rounded-md px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">
          {profile.name ?? profile.email}
        </div>
        <div className="font-mono text-[11px] text-soft truncate">
          {profile.email}
        </div>
      </div>

      <span className="text-[11px] text-soft border border-line rounded px-2 py-0.5">
        {STATUS_LABEL[profile.status]}
      </span>
      {profile.role === "admin" && (
        <span className="text-[11px] text-accent bg-accentbg rounded px-2 py-0.5">
          관리자
        </span>
      )}

      <div className="flex gap-1.5">
        {profile.status !== "active" && (
          <button
            onClick={() => setStatus("active")}
            disabled={busy}
            className="text-xs border border-ink bg-ink text-white rounded px-3 py-1 disabled:opacity-50"
          >
            승인
          </button>
        )}
        {profile.status === "pending" && (
          <button
            onClick={() => setStatus("rejected")}
            disabled={busy}
            className="text-xs border border-line rounded px-3 py-1 hover:bg-[#F0EFE7] disabled:opacity-50"
          >
            거절
          </button>
        )}
        {profile.status === "active" && (
          <>
            <button
              onClick={toggleRole}
              disabled={busy}
              className="text-xs border border-line rounded px-3 py-1 hover:bg-[#F0EFE7] disabled:opacity-50"
            >
              {profile.role === "admin" ? "관리자 해제" : "관리자로"}
            </button>
            <button
              onClick={() => setStatus("suspended")}
              disabled={busy}
              className="text-xs border border-line rounded px-3 py-1 hover:bg-[#F0EFE7] disabled:opacity-50"
            >
              정지
            </button>
          </>
        )}
      </div>
    </div>
  );
}
