"use client";
import { useFormStatus } from "react-dom";
import { deleteTemplateItemAction } from "@/app/actions/curriculum-actions";
import type { CurriculumDetail, TemplateItemView } from "../curriculum.types";
import { CurriculumEditorDialog } from "./curriculum-editor-dialog";

function DeleteButtons({ onClose }: { onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={onClose}
        className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50"
      >
        取消
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "刪除中…" : "確認刪除"}
      </button>
    </div>
  );
}

export function CurriculumItemDeleteDialog({
  data,
  item,
  onClose,
}: {
  data: CurriculumDetail;
  item: TemplateItemView;
  onClose: () => void;
}) {
  const children = data.items.filter((row) => row.parentId === item.id);
  return (
    <CurriculumEditorDialog title={`確認刪除「${item.title}」`} onClose={onClose}>
      <form action={deleteTemplateItemAction} className="space-y-5">
        <input type="hidden" name="versionId" value={data.versionId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="revision" value={data.revision} />
        <p className="text-sm text-slate-600">
          此操作會刪除草稿中的這個項目，不會修改已發布版本或學生既有學習紀錄。
        </p>
        {children.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-bold">以下 {children.length} 個子項目也會一併刪除：</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {children.map((child) => (
                <li key={child.id} className="break-words">
                  {child.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        <DeleteButtons onClose={onClose} />
      </form>
    </CurriculumEditorDialog>
  );
}
