import { toggleCardImportant } from "@/app/cards/important-actions";

export function ImportantButton({
  cardId,
  important,
}: {
  cardId: string;
  important: boolean;
}) {
  return (
    <form action={toggleCardImportant.bind(null, cardId)}>
      <button
        aria-pressed={important}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          important
            ? "bg-amber-400 text-amber-950"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
        }`}
        type="submit"
      >
        {important ? "★ 중요" : "☆ 중요 체크"}
      </button>
    </form>
  );
}
