import { reviewCardQuality } from "@/app/admin/quality/actions";
import type { CardQualityVerdict } from "@/lib/card-quality";

export function CardQualityForm({
  cardId,
  currentNote,
  currentVerdict,
  ruleVersion,
  score,
}: {
  cardId: string;
  currentNote?: string | null;
  currentVerdict?: CardQualityVerdict;
  ruleVersion?: string | null;
  score?: number | null;
}) {
  return (
    <form action={reviewCardQuality} className="mt-4 grid gap-3 sm:grid-cols-4">
      <input name="cardId" type="hidden" value={cardId} />
      <input name="scoreSnapshot" type="hidden" value={score ?? ""} />
      <input name="ruleVersion" type="hidden" value={ruleVersion ?? ""} />
      <select
        className="rounded-md border border-neutral-300 bg-white p-2 text-sm"
        defaultValue={currentVerdict ?? "unsure"}
        name="verdict"
      >
        <option value="valuable">볼 가치 있음</option>
        <option value="not_valuable">볼 가치 없음</option>
        <option value="unsure">보류</option>
      </select>
      <input
        className="rounded-md border border-neutral-300 p-2 text-sm sm:col-span-2"
        defaultValue={currentNote ?? ""}
        name="note"
        placeholder="판단 근거 또는 규칙 조정 메모"
      />
      <button
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        type="submit"
      >
        평가 저장
      </button>
    </form>
  );
}
