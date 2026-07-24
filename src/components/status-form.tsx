import { changeUserStatus } from "@/app/admin/users/actions";
import type { UserStatus } from "@/lib/auth-types";

type StatusFormProps = {
  userId: string;
  currentStatus: UserStatus;
};

export function StatusForm({ userId, currentStatus }: StatusFormProps) {
  return (
    <form action={changeUserStatus} className="flex items-center gap-2">
      <input name="userId" type="hidden" value={userId} />
      <select
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
        defaultValue={currentStatus}
        name="status"
      >
        <option value="active">active</option>
        <option value="rejected">rejected</option>
        <option value="suspended">suspended</option>
      </select>
      <button
        className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white"
        type="submit"
      >
        변경
      </button>
    </form>
  );
}
