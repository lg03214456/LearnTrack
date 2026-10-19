"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTemplateItemStateAction } from "@/app/actions/curriculum-actions";
import type {
  CurriculumCommandResult,
  CurriculumDetail,
  TemplateItemView,
} from "../curriculum.types";
import { CurriculumEditorDialog } from "./curriculum-editor-dialog";

const initialState: CurriculumCommandResult = { ok: false, code: "OK", message: "" };
const types = {
  unit: "單元",
  chapter: "章節",
  material: "教材",
  worksheet: "講義／練習",
  assessment: "考卷／測驗",
};
function ItemForm({
  data,
  item,
  onSaved,
}: {
  data: CurriculumDetail;
  item: TemplateItemView;
  onSaved: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTemplateItemStateAction,
    initialState,
  );
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="versionId" value={data.versionId} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="revision" value={data.revision} />
      <fieldset disabled={isPending} className="space-y-4">
        <label className="block text-sm font-bold">
          項目名稱
          <input name="title" defaultValue={item.title} required className="input mt-2 w-full" />
        </label>
        <label className="block text-sm font-bold">
          項目類型
          <select name="type" defaultValue={item.type} className="input mt-2 w-full">
            {Object.entries(types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          所屬單元
          <select name="parentId" defaultValue={item.parentId ?? ""} className="input mt-2 w-full">
            <option value="">無（最上層）</option>
            {data.items
              .filter((row) => row.type === "unit" && !row.parentId && row.id !== item.id)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
          </select>
        </label>
      </fieldset>
      {state.message && (
        <p role="status" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button
        disabled={isPending || state.ok}
        className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50"
      >
        {isPending ? "儲存中…" : "儲存內容"}
      </button>
    </form>
  );
}
export function CurriculumItemEditor({
  data,
  item,
  onClose,
}: {
  data: CurriculumDetail;
  item: TemplateItemView;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <CurriculumEditorDialog title="編輯教材內容" onClose={onClose}>
      <ItemForm
        data={data}
        item={item}
        onSaved={() => {
          onClose();
          router.refresh();
        }}
      />
    </CurriculumEditorDialog>
  );
}
