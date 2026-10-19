"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveExamRangeAction } from "@/app/actions/exam-range-actions";
import { Card, ProgressBar } from "@/components/ui";
import type { ExamRangeItem, ExamRangeRecord, ExamRangeWorkspace } from "../exam-range.types";
import {
  buildExamRangeView,
  expandExamRangeSelection,
  isExamRangeItemSelectable,
} from "../exam-range-progress";
import { CurriculumEditorDialog } from "./curriculum-editor-dialog";

export function ExamRangeForm({
  studentId,
  workspace,
  range,
  onClose,
  onSaved,
  onPendingChange,
  contextKey,
}: {
  studentId: string;
  workspace: ExamRangeWorkspace;
  range?: ExamRangeRecord;
  onClose: () => void;
  onSaved: () => void;
  onPendingChange?: (pending: boolean) => void;
  contextKey?: string;
}) {
  const [name, setName] = useState(range?.name ?? "");
  const [examDate, setExamDate] = useState(range?.examDate ?? "");
  const [selectedIds, setSelectedIds] = useState(range?.itemIds ?? []);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [isUncertain, setIsUncertain] = useState(false);
  const busy = useRef(false);
  const canSelect = (item: ExamRangeItem) =>
    item.type !== "unit" && (isExamRangeItemSelectable(item) || !!range?.itemIds.includes(item.id));
  const plans = [...new Set(workspace.items.map((item) => item.planId))];
  const close = () => {
    if (!isPending) onClose();
  };
  const toggle = (ids: string[], checked: boolean) =>
    setSelectedIds((previous) =>
      checked ? [...new Set([...previous, ...ids])] : previous.filter((id) => !ids.includes(id)),
    );
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy.current || isUncertain) return;
        busy.current = true;
        setIsPending(true);
        onPendingChange?.(true);
        setMessage("");
        try {
          const command = {
            studentId,
            rangeId: range?.id ?? null,
            revision: range?.revision ?? 0,
            name,
            examDate: examDate || null,
            itemIds: selectedIds,
          };
          const result = contextKey
            ? await saveExamRangeAction(command, contextKey)
            : await saveExamRangeAction(command);
          if (result.ok) onSaved();
          else {
            setMessage(result.message);
            setIsUncertain(!!result.isUncertain);
          }
        } catch {
          setIsUncertain(true);
          setMessage("連線中斷，請重新載入確認儲存結果後再試");
        } finally {
          setIsPending(false);
          busy.current = false;
          onPendingChange?.(false);
        }
      }}
    >
      <fieldset disabled={isPending || isUncertain} className="min-w-0 space-y-4">
        <label className="block text-sm font-medium">
          段考名稱
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input mt-1 w-full"
            placeholder="例如：第一次段考"
          />
        </label>
        <label className="block text-sm font-medium">
          考試日期（選填）
          <input
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
            className="input mt-1 w-full"
          />
        </label>
        <p className="text-xs text-slate-500">
          只計算勾選內容的完成狀態，不混入考卷分數。勾選單元會選取可用子項目，單元標題不重複計數。
        </p>
        {plans.map((planId) => {
          const items = workspace.items.filter((item) => item.planId === planId);
          if (!items.some(canSelect)) return null;
          return (
            <fieldset key={planId} className="min-w-0 rounded-xl border p-3">
              <legend className="max-w-full px-1 text-sm font-bold break-words">
                {items[0].planLabel}
              </legend>
              {items.map((item) => {
                if (item.type === "unit") {
                  let children: string[] = [];
                  try {
                    children = expandExamRangeSelection([item.id], items).filter((id) =>
                      items.some((row) => row.id === id && canSelect(row)),
                    );
                  } catch {
                    /* Empty units have no countable content. */
                  }
                  if (!children.length) return null;
                  return (
                    <label
                      key={item.id}
                      className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-sm font-bold"
                    >
                      <input
                        type="checkbox"
                        checked={children.every((id) => selectedIds.includes(id))}
                        onChange={(event) => toggle(children, event.target.checked)}
                        className="mt-1 shrink-0"
                      />
                      <span className="min-w-0 break-words">{item.title}（整個單元）</span>
                    </label>
                  );
                }
                if (!canSelect(item)) return null;
                return (
                  <label key={item.id} className="flex items-start gap-2 py-2 pl-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => toggle([item.id], event.target.checked)}
                      className="mt-1 shrink-0"
                    />
                    <span className="min-w-0 break-words">
                      {item.title}
                      {!isExamRangeItemSelectable(item) && (
                        <span className="ml-1 text-xs text-amber-700">（舊範圍，請確認）</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          );
        })}
        {!workspace.items.some(canSelect) && (
          <p className="text-sm text-slate-500">沒有可選的教材內容，請先建立修課計畫及教材內容。</p>
        )}
      </fieldset>
      <p aria-live="polite" className="text-sm text-slate-600">
        已選 {selectedIds.length} 項
      </p>
      {message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={close}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          取消
        </button>
        <button
          disabled={isPending || isUncertain || !selectedIds.length}
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "儲存中…" : "儲存範圍"}
        </button>
      </div>
    </form>
  );
}

function ExamRangeEditor(props: Parameters<typeof ExamRangeForm>[0]) {
  const [isPending, setIsPending] = useState(false);
  return (
    <CurriculumEditorDialog
      title={props.range ? "編輯段考範圍" : "設定段考範圍"}
      onClose={props.onClose}
      isPending={isPending}
    >
      <ExamRangeForm {...props} onPendingChange={setIsPending} />
    </CurriculumEditorDialog>
  );
}

export function StudentExamRanges({
  studentId,
  workspace,
  canManage,
}: {
  studentId: string;
  workspace: ExamRangeWorkspace | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ studentId: string; range?: ExamRangeRecord } | null>(null);
  return (
    <Card className="mb-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">段考範圍與完成率</h2>
        {canManage && workspace && (
          <button
            type="button"
            onClick={() => setEditor({ studentId })}
            className="rounded-lg border border-teal-700 px-3 py-2 text-sm font-bold text-teal-800"
          >
            設定段考範圍
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        此學生個別設定；範圍完成率與整份教材進度分開計算。
      </p>
      {!workspace ? (
        <div role="alert" className="mt-4 text-sm text-amber-800">
          <p>段考範圍暫時無法載入，請確認 SQL 更新已套用後重試。原修課進度不受影響。</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-2 rounded-lg border px-3 py-2"
          >
            重新載入段考範圍
          </button>
        </div>
      ) : !workspace.ranges.length ? (
        <p className="mt-4 text-sm text-slate-500">
          尚未設定段考範圍，設定後即可查看這次段考的完成百分比。
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {workspace.ranges.map((range) => {
            const view = buildExamRangeView(range, workspace.items);
            return (
              <section
                key={range.id}
                aria-label={range.name}
                className="min-w-0 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-bold break-words">{range.name}</h3>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={`編輯${range.name}範圍`}
                      onClick={() => setEditor({ studentId, range })}
                      className="text-sm font-bold text-teal-800"
                    >
                      編輯範圍
                    </button>
                  )}
                </div>
                {range.examDate && (
                  <p className="mt-1 text-xs text-slate-500">考試日期：{range.examDate}</p>
                )}
                <p className="mt-2 text-xs break-words text-slate-500">
                  {view.materialLabels.join("、")}
                </p>
                <p className="my-3 text-sm">
                  已完成 {view.completed} / {view.total} 項{" "}
                  <strong className="float-right text-teal-800">{view.percentage}%</strong>
                </p>
                <ProgressBar value={view.percentage} />
                {view.needsReview && (
                  <p className="mt-3 text-xs text-amber-800">
                    教材計畫已更換、封存或有內容移除，請檢查範圍；舊紀錄與原範圍仍保留。
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
      {editor?.studentId === studentId && workspace && (
        <ExamRangeEditor
          key={editor.range?.id ?? "new"}
          studentId={studentId}
          workspace={workspace}
          range={editor.range}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
