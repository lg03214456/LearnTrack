"use client";
import { useActionState, useState } from "react";
import { StudentManagementDialog } from "./student-management-dialog";
import {
  correctAssessmentResultStateAction,
  recordExtraAssessmentResultStateAction,
  recordAssessmentResultStateAction,
  updateStudentProfileAction,
  type AssessmentFormState,
  type ExtraAssessmentFormState,
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
      className={`rounded-lg px-3 py-2 text-xs sm:col-span-2 ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
    >
      {state.message}
    </p>
  ) : null;

function ResultEntryForm({ detail }: { detail: StudentDetailView }) {
  const [state, action, pending] = useActionState(recordAssessmentResultStateAction, initial);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const selectedAssessment = detail.assessment.availableAssessments.find(
    (assessment) => assessment.id === selectedAssessmentId,
  );
  if (!detail.assessment.availableAssessments.length) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        目前沒有可登錄的教材考卷。請確認學生已綁定修課計畫，且考卷尚未登錄；已登錄的成績請使用更正功能。
      </p>
    );
  }
  return (
    <form
      key={`${state.message}-${state.values.assessmentId}`}
      action={action}
      className="grid min-w-0 gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="studentId" value={detail.profile.id} />
      <label className="min-w-0 text-xs text-slate-600 sm:col-span-2">
        教材考卷
        <select
          className={input}
          name="assessmentId"
          required
          defaultValue={state.values.assessmentId}
          onChange={(event) => setSelectedAssessmentId(event.target.value)}
        >
          <option value="" disabled>
            請選擇學生綁定的考卷
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
          max={selectedAssessment?.maximumScore}
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

const initialExtraAssessment: ExtraAssessmentFormState = {
  ok: false,
  code: "OK",
  message: "",
  values: {
    termId: "",
    subject: "",
    title: "",
    date: "",
    maximumScore: "100",
    score: "",
    comment: "",
  },
};

function ExtraAssessmentResultForm({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(
    recordExtraAssessmentResultStateAction,
    initialExtraAssessment,
  );
  return (
    <form action={action} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <input type="hidden" name="studentId" value={studentId} />
      {[
        ["學期", "termId", "例如 115-1", "text"],
        ["科目", "subject", "例如 數學", "text"],
        ["考卷名稱", "title", "例如 第一次段考", "text"],
        ["考試日期", "date", "", "date"],
      ].map(([label, name, placeholder, type]) => (
        <label key={name} className="min-w-0 text-xs text-slate-600">
          {label}
          <input
            className={input}
            name={name}
            type={type}
            placeholder={placeholder}
            required
            defaultValue={state.values[name as keyof typeof state.values]}
          />
        </label>
      ))}
      <label className="min-w-0 text-xs text-slate-600">
        滿分
        <input
          className={input}
          name="maximumScore"
          type="number"
          min="0.5"
          step="0.5"
          required
          defaultValue={state.values.maximumScore}
        />
      </label>
      <label className="min-w-0 text-xs text-slate-600">
        得分
        <input
          className={input}
          name="score"
          type="number"
          min="0"
          step="0.5"
          required
          defaultValue={state.values.score}
        />
      </label>
      <label className="min-w-0 text-xs text-slate-600 sm:col-span-2">
        老師評語（選填）
        <input className={input} name="comment" defaultValue={state.values.comment} />
      </label>
      {state.message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-xs sm:col-span-2 ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="h-10 rounded-lg bg-teal-800 px-4 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2"
      >
        {pending ? "登錄中…" : "新增額外考卷並登錄成績"}
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
    <StudentManagementDialog title={title} description={description}>
      {children}
    </StudentManagementDialog>
  );
}

export function AssessmentEntryActions({ detail }: { detail: StudentDetailView }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StudentManagementDialog
        title="登錄教材考卷"
        triggerLabel="登錄教材考卷"
        description="只列出學生綁定且尚未登錄的考卷。"
      >
        <ResultEntryForm detail={detail} />
      </StudentManagementDialog>
      <StudentManagementDialog
        title="新增額外考卷"
        triggerLabel="新增額外考卷"
        description="建立額外考卷並同時登錄這位學生的分數。"
      >
        <ExtraAssessmentResultForm studentId={detail.profile.id} />
      </StudentManagementDialog>
    </div>
  );
}

export function AssessmentCorrectionButton({
  studentId,
  row,
}: {
  studentId: string;
  row: AssessmentResultView;
}) {
  return (
    <StudentManagementDialog
      title={`更正：${row.subject}・${row.title}`}
      triggerLabel="編輯成績"
      description={`${row.date} · ${row.score} / ${row.maximumScore} 分`}
    >
      <CorrectionForm studentId={studentId} row={row} />
    </StudentManagementDialog>
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
        <ToolPanel title="編輯個人與家長資料" description="修改學生聯絡方式與家長資料。">
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
        <ToolPanel title="登錄教材考卷" description="只列出學生綁定且尚未登錄的考卷。">
          <ResultEntryForm detail={detail} />
        </ToolPanel>
      )}
      {canManageAssessments && (
        <ToolPanel
          title="新增額外考卷"
          description="建立不屬於目前教材的考卷，並同時登錄這位學生的分數。"
        >
          <ExtraAssessmentResultForm studentId={detail.profile.id} />
        </ToolPanel>
      )}
      {canManageAssessments && detail.assessment.rows.length > 0 && (
        <section aria-label="更正既有成績" className="space-y-3">
          <h3 className="text-sm font-bold">更正既有成績</h3>
          <p className="text-xs text-slate-500">以下為目前篩選頁面的成績，選擇一筆後更正。</p>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {detail.assessment.rows.map((row) => (
              <ToolPanel
                key={row.id}
                title={`更正：${row.subject}・${row.title}`}
                description={`${row.date} · ${row.score} / ${row.maximumScore} 分`}
              >
                <CorrectionForm studentId={detail.profile.id} row={row} />
              </ToolPanel>
            ))}
          </div>
        </section>
      )}
      {!canManageProfile && !canManageAssessments && <p className="sr-only">目前沒有可編輯項目</p>}
    </div>
  );
}
