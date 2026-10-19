import { Card } from "@/components/ui";
import type { AssessmentFilters, StudentDetailView } from "../student-profile.types";
import { AssessmentReportDownload } from "./student-report-downloads";
import { AssessmentEntryActions, AssessmentCorrectionButton } from "./student-detail-management";

export function StudentAssessmentHistory({
  detail,
  filters,
  classId,
  canManageAssessments = false,
}: {
  detail: StudentDetailView;
  filters: AssessmentFilters;
  classId?: string;
  canManageAssessments?: boolean;
}) {
  const { assessment } = detail;
  return (
    <Card className="overflow-hidden">
      <div className="from-brand-soft flex flex-wrap items-center justify-between gap-4 border-b bg-gradient-to-r to-teal-50 px-5 py-4">
        <div>
          <p className="text-brand text-xs font-bold tracking-wide">ASSESSMENT HISTORY</p>
          <h2 className="mt-1 text-lg font-bold">考試成績與學習表現</h2>
          <p className="mt-1 text-xs text-slate-500">
            依學期與科目查看歷史成績，快速掌握近期趨勢。
          </p>
        </div>
        <div className="flex h-12 min-w-48 items-end gap-1.5 rounded-xl bg-white/80 px-3 py-2 shadow-sm">
          {assessment.summary.trend.map((point, index) => (
            <span
              key={`${point.label}-${index}`}
              title={`${point.label} ${point.percentage}%`}
              className="from-brand flex-1 rounded-t bg-gradient-to-t to-teal-300"
              style={{ height: `${Math.max(8, point.percentage)}%` }}
            />
          ))}
        </div>
      </div>
      {canManageAssessments && (
        <div className="flex justify-end border-b px-5 py-4">
          <AssessmentEntryActions detail={detail} />
        </div>
      )}
      <form method="get" className="flex flex-wrap items-end gap-3 border-b px-5 py-4">
        <input type="hidden" name="tab" value="assessments" />
        {classId && <input type="hidden" name="classId" value={classId} />}
        <label className="text-xs font-medium text-slate-600">
          學期
          <select name="termId" defaultValue={filters.termId ?? ""} className="input mt-1 block">
            <option value="">全部學期</option>
            {assessment.terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          科目
          <select name="subject" defaultValue={filters.subject ?? ""} className="input mt-1 block">
            <option value="">全部科目</option>
            {assessment.subjects.map((subject) => (
              <option key={subject}>{subject}</option>
            ))}
          </select>
        </label>
        <button className="bg-brand hover:bg-brand-deep h-10 rounded-lg px-4 text-sm font-bold text-white">
          套用篩選
        </button>
        <AssessmentReportDownload
          studentId={detail.profile.id}
          studentName={detail.profile.name}
          rows={assessment.exportRows}
        />
      </form>
      <div className="grid min-w-0 gap-4 p-5 lg:grid-cols-2" aria-label="成績紀錄">
        {assessment.rows.map((row) => (
          <article
            key={row.id}
            aria-label={`${row.subject}・${row.title}`}
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-teal-700">
                {row.subject} · {row.termId}
              </span>
              <time className="text-xs text-slate-500" dateTime={row.date}>
                {row.date}
              </time>
            </div>
            <h3 className="mt-2 text-base font-bold break-words">{row.title}</h3>
            <div className="my-4 flex items-center gap-3">
              <p className="text-2xl font-bold tabular-nums">
                <span>{row.score}</span>
                <span className="ml-1 text-sm font-normal text-slate-500">
                  / {row.maximumScore}
                </span>
              </p>
              <span
                className={`pill ${row.percentage >= 80 ? "bg-emerald-50 text-emerald-700" : row.percentage >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}
              >
                {row.percentage}%
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">老師評語</p>
              <p className="mt-1 text-sm break-words whitespace-pre-wrap text-slate-700">
                {row.comment || "尚無評語"}
              </p>
            </div>
            {canManageAssessments && (
              <div className="mt-3 flex justify-end">
                <AssessmentCorrectionButton studentId={detail.profile.id} row={row} />
              </div>
            )}
          </article>
        ))}
      </div>
      {!assessment.rows.length && (
        <div className="p-12 text-center text-slate-500">沒有符合條件的考試紀錄</div>
      )}
      <div className="border-t px-5 py-3 text-xs text-slate-500">
        共 {assessment.pagination.total} 筆紀錄
      </div>
    </Card>
  );
}
