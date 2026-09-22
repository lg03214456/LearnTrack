import { Card } from "@/components/ui";
import type { AssessmentFilters, StudentDetailView } from "../student-profile.types";
import { AssessmentReportDownload } from "./student-report-downloads";

export function StudentAssessmentHistory({
  detail,
  filters,
  classId,
}: {
  detail: StudentDetailView;
  filters: AssessmentFilters;
  classId?: string;
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>科目／考試</th>
              <th>成績</th>
              <th>換算</th>
              <th>老師評語</th>
            </tr>
          </thead>
          <tbody>
            {assessment.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>
                  <b>{row.subject}</b>
                  <small className="block text-slate-500">{row.title}</small>
                </td>
                <td>
                  <b>{row.score}</b> / {row.maximumScore}
                </td>
                <td>
                  <span
                    className={`pill ${row.percentage >= 80 ? "bg-emerald-50 text-emerald-700" : row.percentage >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}
                  >
                    {row.percentage}%
                  </span>
                </td>
                <td className="max-w-64 whitespace-normal text-slate-600">{row.comment || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
