import { asc } from "drizzle-orm";
import Link from "next/link";

import { StatusForm } from "@/components/status-form";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link className="text-sm underline" href="/today">
        오늘로 돌아가기
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">사용자 관리</h1>

      <div className="mt-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium">사용자</th>
              <th className="px-4 py-3 font-medium">역할</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">변경</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr className="border-b border-neutral-100" key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name ?? "이름 없음"}</p>
                  <p className="text-neutral-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status}</td>
                <td className="px-4 py-3">
                  <StatusForm
                    currentStatus={user.status}
                    userId={user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
