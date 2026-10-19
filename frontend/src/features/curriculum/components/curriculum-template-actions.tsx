"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  copyVersionAction,
  readTemplateEditorAction,
  updateTemplateStateAction,
} from "@/app/actions/curriculum-actions";
import type {
  CurriculumCommandResult,
  CurriculumTemplateEditor,
  CurriculumTemplateView,
} from "../curriculum.types";
import { CurriculumEditorDialog } from "./curriculum-editor-dialog";
import { CurriculumTemplateDeleteForm } from "./curriculum-template-delete";

const initialState: CurriculumCommandResult = { ok: false, code: "OK", message: "" };

function TemplateForm({
  editor,
  onSaved,
}: {
  editor: CurriculumTemplateEditor;
  onSaved: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateTemplateStateAction, initialState);
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="templateId" value={editor.templateId} />
      <input type="hidden" name="revision" value={editor.revision} />
      <fieldset disabled={isPending} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm font-bold">
          教材名稱
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={editor.name}
            className="input mt-2 w-full"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["gradeId", "subjectId", "publisherId"] as const).map((key, index) => {
            const locked = key !== "publisherId" && !editor.canEditClassification;
            const options = [
              editor.dimensions.grades,
              editor.dimensions.subjects,
              editor.dimensions.publishers,
            ][index];
            return (
              <div key={key} className="min-w-0">
                {locked && <input type="hidden" name={key} value={editor[key]} />}
                <label className="block text-sm font-bold">
                  {["年級", "科目", "出版社"][index]}
                  <select
                    name={locked ? undefined : key}
                    defaultValue={editor[key]}
                    disabled={locked}
                    required
                    className="input mt-2 w-full min-w-0 disabled:bg-slate-100"
                  >
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      {!editor.canEditClassification && (
        <p className="text-xs text-slate-500">
          教材已發布或已被學生使用，年級與科目不可更改；內容請透過新草稿調整。
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button
        disabled={isPending || state.ok}
        className="w-full rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "儲存中…" : "儲存基本資料"}
      </button>
    </form>
  );
}

export function CurriculumTemplateActions({ row }: { row: CurriculumTemplateView }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [mode, setMode] = useState<"metadata" | "copy" | "delete" | null>(null);
  const [editor, setEditor] = useState<CurriculumTemplateEditor>();
  const [message, setMessage] = useState("");
  const [isLoading, startTransition] = useTransition();
  const draft = [...row.versions]
    .filter((version) => version.status === "draft")
    .sort((a, b) => b.number - a.number)[0];
  const latest = [...row.versions].sort((a, b) => b.number - a.number)[0];
  function loadEditor() {
    setEditor(undefined);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await readTemplateEditorAction(row.id);
        setEditor(result.editor);
        setMessage(result.message ?? "");
      } catch {
        setMessage("資料暫時無法載入，請稍後重試");
      }
    });
  }
  function openMetadata() {
    if (menuRef.current) menuRef.current.open = false;
    setMode("metadata");
    loadEditor();
  }
  return (
    <>
      <details
        ref={menuRef}
        className="relative shrink-0"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuRef.current) menuRef.current.open = false;
        }}
      >
        <summary
          aria-label={`${row.name}更多操作`}
          className="cursor-pointer list-none rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <MoreVertical size={17} />
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border bg-white p-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={openMetadata}
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
          >
            編輯基本資料
          </button>
          {draft ? (
            <Link
              href={`/curriculum/templates/${draft.id}`}
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              編輯內容
            </Link>
          ) : latest ? (
            <button
              type="button"
              onClick={() => {
                if (menuRef.current) menuRef.current.open = false;
                setMode("copy");
              }}
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
            >
              編輯內容
            </button>
          ) : (
            <p className="px-3 py-2 text-slate-500">沒有可編輯版本</p>
          )}
          <button
            type="button"
            onClick={() => {
              if (menuRef.current) menuRef.current.open = false;
              setMode("delete");
            }}
            className="mt-1 w-full rounded-lg border-t border-slate-100 px-3 py-2 text-left text-red-700 hover:bg-red-50"
          >
            刪除教材
          </button>
        </div>
      </details>
      {mode && (
        <CurriculumEditorDialog
          title={
            mode === "metadata"
              ? "編輯教材基本資料"
              : mode === "delete"
                ? "刪除整份教材"
                : "建立內容草稿"
          }
          onClose={() => setMode(null)}
        >
          {mode === "delete" ? (
            <CurriculumTemplateDeleteForm template={row} onClose={() => setMode(null)} />
          ) : mode === "metadata" ? (
            editor ? (
              <TemplateForm
                editor={editor}
                onSaved={() => {
                  setMode(null);
                  router.refresh();
                }}
              />
            ) : (
              <div aria-live="polite">
                {isLoading ? (
                  "正在載入教材資料…"
                ) : (
                  <>
                    <p role="alert">{message}</p>
                    <button
                      type="button"
                      onClick={loadEditor}
                      className="mt-4 rounded-lg border px-4 py-2"
                    >
                      重新載入
                    </button>
                  </>
                )}
              </div>
            )
          ) : (
            latest && (
              <form action={copyVersionAction} className="space-y-4">
                <p className="text-sm text-slate-600">
                  已發布的版本 {latest.number}{" "}
                  不會直接修改。先複製為新草稿，再編輯單元、教材與考卷；學生現有修課計畫與進度不受影響。
                </p>
                <input type="hidden" name="versionId" value={latest.id} />
                <input type="hidden" name="revision" value={latest.revision} />
                <CopySubmit />
              </form>
            )
          )}
        </CurriculumEditorDialog>
      )}
    </>
  );
}

function CopySubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50"
    >
      {pending ? "建立中…" : "複製並編輯內容"}
    </button>
  );
}
