"use client";
import { useActionState } from "react";
import { ChevronDown, FilePenLine, PlusCircle } from "lucide-react";
import {
  correctAssessmentResultStateAction,
  recordAssessmentResultStateAction,
  updateStudentProfileAction,
  type AssessmentFormState,
} from "@/app/actions/student-detail-actions";
import type { AssessmentResultView, StudentDetailView } from "../student-profile.types";

const input = "input mt-1 w-full";
const initial: AssessmentFormState = {
  ok: false,
  code: "OK",
  message: "",
  values: { assessmentId: "", score: "", comment: "" },
};
const Feedback = ({ state }: { state: AssessmentFormState }) =>
  state.message ? (
    <p
      role="status"
      className={`col-span-2 rounded-lg px-3 py-2 text-xs ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
    >
      {state.message}
    </p>
  ) : null;

function ResultEntryForm({ detail }: { detail: StudentDetailView }) {
  const [state, action, pending] = useActionState(recordAssessmentResultStateAction, initial);
  return (
    <form
      key={`${state.message}-${state.values.assessmentId}`}
      action={action}
      className="grid min-w-0 gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="studentId" value={detail.profile.id} />
      <label className="min-w-0 text-xs text-slate-600 sm:col-span-2">
        測驗
        <select
          className={input}
          name="assessmentId"
          required
          defaultValue={state.values.assessmentId}
        >
          <option value="" disabled>
            請選擇測驗
          </option>
          {detail.assessment.availableAssessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.termId}・{assessment.subject}・{assessment.title}（滿分{" "}
              {assessment.maximumScore}）
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-xs text-slate-600">
        分數
        <input
          className={input}
          name="score"
          required
          type="number"
          min="0"
          step="0.5"
          defaultValue={state.values.score}
        />
      </label>
      <label className="min-w-0 text-xs text-slate-600">
        老師評語
        <input className={input} name="comment" defaultValue={state.values.comment} />
      </label>
      <Feedback state={state} />
      <button
        disabled={pending}
        className="h-10 rounded-lg bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"
      >
        {pending ? "登錄中…" : "登錄成績"}
      </button>
    </form>
  );
}

function CorrectionForm({ studentId, row }: { studentId: string; row: AssessmentResultView }) {
  const seeded = {
    ...initial,
    values: { assessmentId: "", score: String(row.score), comment: row.comment },
  };
  const [state, action, pending] = useActionState(correctAssessmentResultStateAction, seeded);
  return (
    <form
      action={action}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_6rem] gap-2 rounded-xl border p-3"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="resultId" value={row.id} />
      <input type="hidden" name="revision" value={row.revision} />
      <p className="col-span-2 text-sm font-bold">
        {row.subject}・{row.title}
      </p>
      <input
        className="input min-w-0"
        name="comment"
        aria-label={`${row.title}評語`}
        defaultValue={state.values.comment}
      />
      <input
        className="input min-w-0"
        name="score"
        aria-label={`${row.title}分數`}
        type="number"
        min="0"
        max={row.maximumScore}
        step="0.5"
        required
        defaultValue={state.values.score}
      />
      <Feedback state={state} />
      <button
        disabled={pending}
        className="col-span-2 rounded-lg border border-teal-800 py-2 text-xs font-bold text-teal-800 disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存更正"}
      </button>
    </form>
  );
}

function ToolPanel({
  title,
  description,
  children,
}: React.PropsWithChildren<{ title: string; description: string }>) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <FilePenLine size={16} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className="block text-xs text-slate-500">{description}</span>
        </span>
        <ChevronDown className="transition-transform group-open:rotate-180" size={17} />
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}

export function StudentDetailManagement({
  detail,
  canManageProfile,
  canManageAssessments,
}: {
  detail: StudentDetailView;
  canManageProfile: boolean;
  canManageAssessments: boolean;
}) {
  const guardian = detail.profile.guardians[0];
  return (
    <div className="mt-5 space-y-3">
      {canManageProfile && guardian && (
        <ToolPanel
          title="編輯個人與家長資料"
          description="需要修改資料時再展開，避免佔用閱讀空間。"
        >
          <form action={updateStudentProfileAction} className="grid min-w-0 gap-3 sm:grid-cols-2">
            <input type="hidden" name="studentId" value={detail.profile.id} />
            <input type="hidden" name="guardianId" value={guardian.id} />
            <input type="hidden" name="revision" value={detail.profile.revision} />
            {[
              ["學生電話", "phone", detail.profile.phone],
              ["就讀學校", "school", detail.profile.school],
              ["年級", "grade", detail.profile.grade],
              ["家長姓名", "guardianName", guardian.name],
              ["家長電話", "guardianPhone", guardian.phone],
            ].map(([label, name, value]) => (
              <label key={name} className="min-w-0 text-xs text-slate-600">
                {label}
                <input className={input} name={name} required defaultValue={value} />
              </label>
            ))}
            <div className="flex items-end">
              <button className="h-10 rounded-lg bg-teal-800 px-4 text-sm font-bold text-white">
                儲存個資
              </button>
            </div>
          </form>
        </ToolPanel>
      )}
      {canManageAssessments && (
        <ToolPanel title="登錄小考成績" description="展開後選擇測驗並登錄本次分數與評語。">
          <ResultEntryForm detail={detail} />
        </ToolPanel>
      )}
      {canManageAssessments && detail.assessment.rows.length > 0 && (
        <ToolPanel
          title="更正既有成績"
          description={`${detail.assessment.rows.length} 筆成績可更正`}
        >
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {detail.assessment.rows.map((row) => (
              <CorrectionForm key={row.id} studentId={detail.profile.id} row={row} />
            ))}
          </div>
        </ToolPanel>
      )}
      {!canManageProfile && !canManageAssessments && (
        <p className="sr-only">
          <PlusCircle />
          目前沒有可編輯項目
        </p>
      )}
    </div>
  );
}
