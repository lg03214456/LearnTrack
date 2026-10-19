"use client";
import { useRef, useState } from "react";
import { saveStudentSetupBasicAction } from "@/app/actions/student-setup-actions";
import type { StudentRosterCommandResult, StudentRosterInput } from "../student-roster.types";
import type { StudentSetupData } from "../student-setup.types";

export function StudentSetupBasicForm({
  data,
  onSaved,
  onPendingChange,
}: {
  data: StudentSetupData;
  onSaved: (values: StudentRosterInput, finish: boolean) => void;
  onPendingChange: (value: boolean) => void;
}) {
  const [result, setResult] = useState<StudentRosterCommandResult>({
    ok: false,
    code: "OK",
    message: "",
    values: data.basic,
  });
  const [isUncertain, setIsUncertain] = useState(false);
  const busy = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const values = result.values;
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy.current || isUncertain) return;
        const form = new FormData(event.currentTarget);
        const finish =
          (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "finish";
        busy.current = true;
        setIsPending(true);
        onPendingChange(true);
        try {
          const saved = await saveStudentSetupBasicAction(data.contextKey, result, form);
          setResult(saved);
          if (saved.ok && saved.values.studentId) onSaved(saved.values, finish);
          else if (saved.ok) setIsUncertain(true);
        } catch {
          setIsUncertain(true);
        } finally {
          busy.current = false;
          setIsPending(false);
          onPendingChange(false);
        }
      }}
    >
      <p className="text-sm text-slate-500">每一步獨立儲存；教材與段考範圍可以稍後設定。</p>
      <fieldset disabled={isPending || isUncertain} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <input type="hidden" name="studentId" value={values.studentId ?? ""} />
        <input type="hidden" name="revision" value={values.revision ?? ""} />
        <input type="hidden" name="includesClassManagement" value={String(data.canManageClasses)} />
        <label className="text-sm">
          學生姓名
          <input name="name" required defaultValue={values.name} className="input mt-1 w-full" />
        </label>
        <label className="text-sm">
          學號
          <input
            name="number"
            readOnly
            defaultValue={values.number}
            placeholder="儲存後自動產生學號"
            className="input mt-1 w-full bg-slate-50"
          />
        </label>
        <label className="text-sm">
          性別
          <select name="gender" defaultValue={values.gender} className="input mt-1 w-full">
            <option>女</option>
            <option>男</option>
          </select>
        </label>
        <label className="text-sm">
          在籍狀態
          <select name="status" defaultValue={values.status} className="input mt-1 w-full">
            <option value="active">在籍</option>
            <option value="leave">停課</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          聯絡電話
          <input
            name="phone"
            required
            defaultValue={values.phone}
            placeholder="0912-345-678"
            className="input mt-1 w-full"
          />
        </label>
        {data.canManageClasses ? (
          <fieldset className="min-w-0 space-y-2 rounded-xl border p-3 sm:col-span-2">
            <legend>所屬班級（可複選）</legend>
            {data.classOptions.map((option) => (
              <label key={option.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="classIds"
                  value={option.id}
                  defaultChecked={values.classIds?.includes(option.id)}
                />
                <span className="min-w-0 break-words">{option.name}</span>
              </label>
            ))}
            {!data.classOptions.length && (
              <p className="text-sm text-slate-500">尚無可選班級，可稍後設定。</p>
            )}
          </fieldset>
        ) : (
          <p className="text-sm sm:col-span-2">無班級管理權限，原班級歸屬保持不變。</p>
        )}
      </fieldset>
      {result.message && (
        <p role="alert" className="text-sm text-red-700">
          {result.message}
          {result.fieldErrors && `：${Object.values(result.fieldErrors).join("、")}`}
        </p>
      )}
      {isUncertain && (
        <p role="alert" className="text-sm text-amber-800">
          無法確認儲存結果，為避免重複建立已停止重送。請關閉後重新載入學生名單確認紀錄，再從個人頁接續設定。
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          disabled={isPending || isUncertain}
          value="finish"
          className="rounded-lg border px-4 py-2"
        >
          儲存並結束
        </button>
        <button
          disabled={isPending || isUncertain}
          value="continue"
          className="rounded-lg bg-teal-800 px-4 py-2 text-white"
        >
          {isPending ? "儲存中…" : "儲存並設定教材"}
        </button>
      </div>
    </form>
  );
}
