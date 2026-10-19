"use client";
import { useRef, useState } from "react";
import { saveStudentSetupPlanAction } from "@/app/actions/curriculum-actions";
import type { StudentStudyPlanPage } from "@/features/curriculum/curriculum.types";

export function StudentSetupMaterialForm({
  data,
  contextKey,
  onSaved,
  onPendingChange,
}: {
  data: StudentStudyPlanPage;
  contextKey: string;
  onSaved: () => Promise<void>;
  onPendingChange: (value: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isUncertain, setIsUncertain] = useState(false);
  const busy = useRef(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy.current || isUncertain) return;
        const form = new FormData(event.currentTarget);
        busy.current = true;
        setIsPending(true);
        onPendingChange(true);
        setMessage("");
        try {
          const result = await saveStudentSetupPlanAction({
            studentId: data.student.id,
            contextKey,
            termId: String(form.get("termId") ?? ""),
            versionId: String(form.get("versionId") ?? ""),
            confirmedReplacement: form.get("confirmedReplacement") === "on",
          });
          if (result.ok) {
            setMessage("教材已儲存，可繼續新增其他教材或設定段考範圍。");
            await onSaved();
          } else setMessage(result.message);
        } catch {
          setIsUncertain(true);
          setMessage("無法確認教材儲存結果，請重新載入確認後再操作；先前已儲存的學生保留。");
        } finally {
          busy.current = false;
          setIsPending(false);
          onPendingChange(false);
        }
      }}
    >
      <fieldset disabled={isPending || isUncertain} className="min-w-0 space-y-4">
        <label className="block text-sm">
          修課學期
          <select name="termId" required className="input mt-1 w-full">
            {data.terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          教材版本
          <select name="versionId" required className="input mt-1 w-full">
            <option value="">請選擇已發布教材</option>
            {data.availableVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>
        </label>
        {!data.availableVersions.length && (
          <p className="text-sm text-slate-500">尚無已發布教材，可稍後設定。</p>
        )}
        {data.plans.some((plan) => plan.status === "active") && (
          <label className="flex items-start gap-2 text-sm text-amber-800">
            <input type="checkbox" name="confirmedReplacement" required />
            <span>
              我了解：同學期同科目若已有計畫，已完成項目會保留，其餘項目標記移除；不同科目可並存。
            </span>
          </label>
        )}
      </fieldset>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <button
        disabled={isPending || isUncertain || !data.availableVersions.length || !data.terms.length}
        className="rounded-lg bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "儲存中…" : "儲存教材"}
      </button>
    </form>
  );
}
