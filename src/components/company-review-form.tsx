import { reviewCompanyCandidate } from "@/app/admin/companies/actions";
import type { CompanyStatus } from "@/lib/companies";

export function CompanyReviewForm({
  companyId,
  currentStatus,
}: {
  companyId: string;
  currentStatus: CompanyStatus;
}) {
  return (
    <form action={reviewCompanyCandidate} className="flex items-center gap-2">
      <input name="companyId" type="hidden" value={companyId} />
      <select
        className="rounded-md border border-neutral-300 bg-white px-2 py-1"
        defaultValue={currentStatus}
        name="status"
      >
        <option value="candidate">candidate</option>
        <option value="approved">approved</option>
        <option value="rejected">rejected</option>
      </select>
      <button
        className="rounded-md bg-neutral-900 px-3 py-1 text-white"
        type="submit"
      >
        저장
      </button>
    </form>
  );
}
