"use client";

import { useEffect, useRef, useState } from "react";
import {
  appendCompletedProgressAction,
  saveDailyProgressAction,
} from "@/app/actions/class-session-actions";
import { CurriculumEditorDialog } from "@/features/curriculum/components/curriculum-editor-dialog";
import type { ClassDailyWorkspace, ClassSessionMemberView } from "../class-session.types";
import { buildCheckedProgressEntries } from "../progress-checklist";

const statusLabels = { pending: "尚未開始", in_progress: "學習中", completed: "已完成" };

export function StudentProgressChecklistDialog({
  data,
  member,
  onClose,
  onSaved,
  onReload,
}: {
  data: ClassDailyWorkspace;
  member: ClassSessionMemberView;
  onClose: () => void;
  onSaved: (message: string) => void;
  onReload: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const busy = useRef(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const entries = buildCheckedProgressEntries(member, selectedIds, note);
  const isCompleted = data.session.status === "completed";
  const hasItems = member.plans.some((plan) => plan.items.length > 0);

  return (
    <CurriculumEditorDialog title="學生進度" onClose={onClose} isPending={isPending}>
      <form
        className="min-w-0 space-y-4"
        aria-busy={isPending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy.current || needsReload || !data.canManage || !entries.length) return;
          if (entries.length > 200) {
            setMessage("單次最多更新 200 項，請分批勾選。");
            return;
          }
          busy.current = true;
          setIsPending(true);
          setMessage("");
          const form = new FormData();
          form.set("sessionId", data.session.id);
          form.set("sessionRevision", String(data.session.revision));
          form.set("classId", data.session.classId);
          form.set("entries", JSON.stringify(entries));
          if (isCompleted) form.set("reason", reason);
          try {
            const action = isCompleted ? appendCompletedProgressAction : saveDailyProgressAction;
            const outcome = await action({ ok: true, code: "OK", message: "" }, form);
            if (!isMounted.current) return;
            if (outcome.ok) onSaved(`${member.studentName}：${entries.length} 項進度已儲存。`);
            else {
              setMessage(outcome.message);
              setNeedsReload(
                outcome.code === "CONFLICT" ||
                  outcome.code === "FORBIDDEN" ||
                  outcome.code === "NOT_FOUND",
              );
            }
          } catch {
            if (isMounted.current) {
              setNeedsReload(true);
              setMessage("無法確認儲存結果，請重新載入確認課堂紀錄後再操作，避免重複登記。");
            }
          } finally {
            busy.current = false;
            if (isMounted.current) setIsPending(false);
          }
        }}
      >
        <div>
          <h3 className="font-bold break-words">{member.studentName}</h3>
          <p className="text-xs text-slate-500">
            {member.studentNumber} · {data.session.sessionDate}
          </p>
        </div>
        <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
          勾選本次完成項目；未勾選保持原狀。原已完成項目僅供查看。
        </p>
        {["leave", "absent"].includes(member.attendanceStatus) && (
          <p className="text-sm text-amber-800">
            此學生本次請假或缺席，預設不更新；只有你明確勾選並確認才會登記。
          </p>
        )}
        {!data.canManage && (
          <p className="text-sm text-slate-500">唯讀檢視，沒有更新課堂進度的權限。</p>
        )}
        <fieldset
          disabled={isPending || needsReload || !data.canManage}
          className="min-w-0 space-y-4"
        >
          {member.plans.map((plan) => (
            <fieldset key={plan.id} className="min-w-0 rounded-xl border border-slate-200">
              <legend className="max-w-full px-3 text-sm font-bold break-words">
                {plan.label} · {plan.versionLabel}
              </legend>
              <p className="px-3 py-2 text-xs text-slate-500">
                已完成 {plan.items.filter((item) => item.status === "completed").length} /{" "}
                {plan.items.length} 項
              </p>
              {plan.items.map((item) => (
                <label
                  key={item.id}
                  className="flex min-w-0 items-start gap-3 border-t border-slate-100 p-3 text-sm has-[:checked]:bg-teal-50"
                >
                  <input
                    type="checkbox"
                    disabled={item.status === "completed"}
                    checked={item.status === "completed" || selectedIds.has(item.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      });
                    }}
                    className="mt-1 size-4 shrink-0 accent-teal-700"
                  />
                  <span className="min-w-0 flex-1 break-words">{item.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {statusLabels[item.status]}
                  </span>
                </label>
              ))}
              {!plan.items.length && (
                <p className="p-3 text-sm text-slate-500">此教材目前沒有可登記項目。</p>
              )}
            </fieldset>
          ))}
          {!hasItems && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
              尚無可登記的教材內容，請先至學生個人頁設定啟用中的修課計畫。
            </p>
          )}
          {data.canManage && hasItems && (
            <label className="block text-sm">
              本次備註（選填）
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                className="input mt-1 min-h-20 w-full"
                placeholder="例如：已完成練習，下一堂接續下一單元"
              />
            </label>
          )}
          {isCompleted && data.canManage && (
            <label className="block text-sm">
              補登原因
              <input
                required
                maxLength={200}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="input mt-1 w-full"
                placeholder="例如：課後補登老師紀錄"
              />
            </label>
          )}
        </fieldset>
        {message && (
          <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        )}
        {needsReload && (
          <button type="button" onClick={onReload} className="rounded-lg border px-3 py-2 text-sm">
            重新載入確認紀錄
          </button>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p aria-live="polite" className="text-sm text-slate-600">
            本次選取 {entries.length} 項
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              {data.canManage ? "取消" : "關閉"}
            </button>
            {data.canManage && (
              <button
                disabled={isPending || needsReload || !entries.length || entries.length > 200}
                className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {isPending ? "儲存中…" : "確認儲存"}
              </button>
            )}
          </div>
        </div>
      </form>
    </CurriculumEditorDialog>
  );
}
