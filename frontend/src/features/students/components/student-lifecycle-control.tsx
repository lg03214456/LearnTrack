"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, X } from "lucide-react";
import { changeStudentLifecycleStateAction } from "@/app/actions/student-roster-actions";
import type { StudentLifecycleCommandResult, StudentListRow } from "../student-roster.types";

function initialState(row: StudentListRow): StudentLifecycleCommandResult {
  return {
    ok: false,
    code: "OK",
    message: "",
    values: {
      studentId: row.id,
      intent: row.status === "archived" ? "restore" : "archive",
      reason: "",
    },
  };
}

export function StudentLifecycleControl({ row }: { row: StudentListRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(
    changeStudentLifecycleStateAction,
    initialState(row),
  );
  const isArchived = row.status === "archived";
  const title = isArchived ? "恢復學生" : "封存學生";

  return (
    <>
      <button
        type="button"
        aria-label={`${title}${row.name}`}
        onClick={() => setIsOpen(true)}
        className={`inline-flex size-9 items-center justify-center rounded-lg border ${isArchived ? "border-teal-200 text-teal-700 hover:bg-teal-50" : "border-slate-200 text-slate-500 hover:border-amber-500 hover:text-amber-700"}`}
      >
        {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      </button>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]"
            role="presentation"
          >
            <button
              type="button"
              aria-label="關閉生命週期設定"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsOpen(false)}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`student-lifecycle-${row.id}`}
              className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b px-5 py-4">
                <div>
                  <h2 id={`student-lifecycle-${row.id}`} className="text-lg font-extrabold">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {row.name}・{row.number}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="關閉"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <form action={action} className="space-y-4 p-5">
                <input type="hidden" name="studentId" value={row.id} />
                <input type="hidden" name="intent" value={isArchived ? "restore" : "archive"} />
                {isArchived ? (
                  <div className="rounded-lg bg-teal-50 p-4 text-sm leading-6 text-teal-900">
                    恢復後會先設為「停課」，不會自動回到原班級或未來點名名單。請確認後再重新安排班級。
                    {row.archiveReason && (
                      <p className="mt-2 border-t border-teal-200 pt-2 text-xs">
                        原封存原因：{row.archiveReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      封存後會從一般名單與未來點名中隱藏，現行班級關係將結束；歷史出勤、成績與進度仍會保留。
                    </div>
                    <label className="block text-sm font-bold text-slate-700">
                      封存原因 <span className="text-red-500">*</span>
                      <textarea
                        name="reason"
                        required
                        minLength={2}
                        rows={3}
                        defaultValue={state.values.reason}
                        className="input mt-1.5 w-full resize-none"
                        placeholder="例如：轉學、長期停課、資料重複建檔"
                      />
                      {state.fieldErrors?.reason && (
                        <span className="mt-1 block text-xs text-red-600">
                          {state.fieldErrors.reason}
                        </span>
                      )}
                    </label>
                  </>
                )}
                {state.message && (
                  <p
                    role="status"
                    className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {state.message}
                  </p>
                )}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    取消
                  </button>
                  <button
                    disabled={pending}
                    className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${isArchived ? "bg-teal-700 hover:bg-teal-800" : "bg-amber-700 hover:bg-amber-800"}`}
                  >
                    {pending ? "處理中…" : isArchived ? "確認恢復" : "確認封存"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
