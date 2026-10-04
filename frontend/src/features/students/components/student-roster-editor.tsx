"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Settings, X } from "lucide-react";
import { saveStudentRosterStateAction } from "@/app/actions/student-roster-actions";
import type {
  StudentClassOption,
  StudentListRow,
  StudentRosterCommandResult,
  StudentRosterInput,
} from "../student-roster.types";

const emptyValues: StudentRosterInput = {
  number: "",
  name: "",
  gender: "女",
  phone: "",
  status: "active",
  classIds: [],
};

function initialState(row?: StudentListRow): StudentRosterCommandResult {
  return {
    ok: false,
    code: "OK",
    message: "",
    values: row
      ? {
          studentId: row.id,
          revision: row.revision,
          number: row.number,
          name: row.name,
          gender: row.gender,
          phone: row.phone,
          status: row.status === "active" ? "active" : "leave",
          classIds: row.classes.map((item) => item.classId),
        }
      : emptyValues,
  };
}

export function StudentRosterEditor({
  row,
  classOptions,
  canManageClasses,
}: {
  row?: StudentListRow;
  classOptions: StudentClassOption[];
  canManageClasses: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(saveStudentRosterStateAction, initialState(row));
  const values = state.values;
  const title = row ? "管理學生主檔" : "新增學生主檔";

  return (
    <>
      <button
        type="button"
        aria-label={row ? `設定${row.name}` : "新增學生"}
        onClick={() => setIsOpen(true)}
        className={
          row
            ? "inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-teal-700 hover:text-teal-800"
            : "bg-brand hover:bg-brand-deep inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white"
        }
      >
        {row ? <Settings size={16} /> : <Plus size={17} />}
        {!row && "新增學生"}
      </button>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]"
            role="presentation"
          >
            <button
              type="button"
              aria-label="關閉學生設定"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsOpen(false)}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-editor-title"
              className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                <div>
                  <h2 id="student-editor-title" className="text-xl font-extrabold tracking-tight">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {row
                      ? `編輯 ${row.name} 的基本資料、在籍狀態與班級歸屬。`
                      : "建立學生基本資料，並可直接設定所屬班級。"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="關閉"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  <X size={18} />
                </button>
              </div>
              <form action={action} className="flex min-h-0 flex-1 flex-col">
                {values.studentId && (
                  <>
                    <input type="hidden" name="studentId" value={values.studentId} />
                    <input type="hidden" name="revision" value={values.revision} />
                  </>
                )}
                <input
                  type="hidden"
                  name="includesClassManagement"
                  value={canManageClasses ? "true" : "false"}
                />
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      學生姓名{" "}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                      <input
                        className="input mt-1.5 w-full"
                        name="name"
                        required
                        defaultValue={values.name}
                      />
                      {state.fieldErrors?.name && (
                        <span className="mt-1 block text-xs text-red-600">
                          {state.fieldErrors.name}
                        </span>
                      )}
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      學號
                      <input
                        className="input mt-1.5 w-full bg-slate-50 text-slate-500"
                        name="number"
                        readOnly
                        placeholder="儲存後自動產生學號"
                        defaultValue={values.number}
                      />
                      {state.fieldErrors?.number && (
                        <span className="mt-1 block text-xs text-red-600">
                          {state.fieldErrors.number}
                        </span>
                      )}
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      性別
                      <select
                        className="input mt-1.5 w-full"
                        name="gender"
                        defaultValue={values.gender}
                      >
                        <option value="女">女</option>
                        <option value="男">男</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      在籍狀態
                      <select
                        className="input mt-1.5 w-full"
                        name="status"
                        defaultValue={values.status}
                      >
                        <option value="active">在籍</option>
                        <option value="leave">停課</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                      聯絡電話{" "}
                      <span className="text-red-500" aria-hidden="true">
                        *
                      </span>
                      <input
                        className="input mt-1.5 w-full"
                        name="phone"
                        required
                        placeholder="0912-345-678"
                        defaultValue={values.phone}
                      />
                      {state.fieldErrors?.phone && (
                        <span className="mt-1 block text-xs text-red-600">
                          {state.fieldErrors.phone}
                        </span>
                      )}
                    </label>
                  </div>
                  {canManageClasses && (
                    <fieldset className="overflow-hidden rounded-xl border border-slate-200">
                      <legend className="sr-only">所屬班級</legend>
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">所屬班級</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          取消勾選只會結束入班關係，不會刪除歷史成績與出缺席。
                        </p>
                      </div>
                      <div className="grid gap-2 p-4 sm:grid-cols-2">
                        {classOptions.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
                          >
                            <input
                              type="checkbox"
                              name="classIds"
                              value={option.id}
                              defaultChecked={values.classIds?.includes(option.id)}
                              className="size-4 accent-teal-700"
                            />
                            {option.name}
                          </label>
                        ))}
                      </div>
                      {state.fieldErrors?.classIds && (
                        <p className="px-4 pb-3 text-xs text-red-600">
                          {state.fieldErrors.classIds}
                        </p>
                      )}
                    </fieldset>
                  )}
                  {state.message && (
                    <p
                      role="status"
                      className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {state.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    disabled={pending}
                    className="bg-brand hover:bg-brand-deep rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {pending ? "儲存中…" : row ? "儲存設定" : "建立學生"}
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
