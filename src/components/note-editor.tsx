import { saveCardNote } from "@/app/cards/note-actions";

export function NoteEditor({ cardId, body }: { cardId: string; body: string }) {
  return (
    <form
      action={saveCardNote.bind(null, cardId)}
      className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
    >
      <label className="grid gap-2">
        <span className="font-semibold">내 메모</span>
        <textarea
          className="min-h-32 resize-y rounded-xl border border-neutral-300 bg-white p-3 text-sm leading-6"
          defaultValue={body}
          maxLength={5_000}
          name="body"
          placeholder="이 자료에서 기억할 내용을 적어두세요."
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          공용 메모 하나 · 내용을 비우고 저장하면 삭제됩니다.
        </p>
        <button
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          type="submit"
        >
          메모 저장
        </button>
      </div>
    </form>
  );
}
