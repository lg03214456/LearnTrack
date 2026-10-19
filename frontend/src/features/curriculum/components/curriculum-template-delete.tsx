"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { archiveTemplateAction } from "@/app/actions/curriculum-actions";
import type { CurriculumTemplateView } from "../curriculum.types";
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
        {pending ? "處理中…" : "確認刪除教材"}
      </button>
    </div>
  );
}

export function CurriculumTemplateDeleteForm({
  template,
  onClose,
}: {
  template: CurriculumTemplateView;
  onClose: () => void;
}) {
  return (
    <form action={archiveTemplateAction} className="space-y-5">
      <input type="hidden" name="templateId" value={template.id} />
      <p className="text-sm font-bold break-words">{template.name}</p>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p>整份教材將軟刪除（封存），包含所有版本，從一般教材列表隱藏，也不能再指派給學生。</p>
        <p className="mt-2">
          已指派的修課計畫、教材內容與學生完成進度仍會保留，不會清除資料。之後可在「已封存」篩選中查閱。
        </p>
      </div>
      <DeleteButtons onClose={onClose} />
    </form>
  );
}

export function CurriculumTemplateDelete({ template }: { template: CurriculumTemplateView }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
      >
        刪除教材
      </button>
      {isOpen && (
        <CurriculumEditorDialog title="刪除整份教材" onClose={() => setIsOpen(false)}>
          <CurriculumTemplateDeleteForm template={template} onClose={() => setIsOpen(false)} />
        </CurriculumEditorDialog>
      )}
    </>
  );
}
