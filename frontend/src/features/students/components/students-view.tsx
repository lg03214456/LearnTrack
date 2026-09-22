import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ListStudentsQuery, StudentListResult } from "../student-roster.types";
import { Card } from "@/components/ui";
import { SelectedClassBanner } from "./selected-class-context";
import { StudentFilters } from "./student-filters";
import { StudentSummary } from "./student-summary";
import { StudentTable } from "./student-table";
import { StudentRosterEditor } from "./student-roster-editor";
export function StudentsView({
  result,
  query,
  canManageStudents = false,
  canManageClasses = false,
}: {
  result: StudentListResult;
  query: ListStudentsQuery;
  canManageStudents?: boolean;
  canManageClasses?: boolean;
}) {
  if (result.state === "unavailable-class")
    return (
      <Card className="p-12 text-center">
        <AlertTriangle className="mx-auto text-amber-500" />
        <h2 className="mt-4 text-lg font-bold">無法使用這個班級篩選</h2>
        <p className="mt-2 text-sm text-slate-500">班級可能不存在或你沒有查看權限。</p>
        <Link
          href="/students"
          className="bg-brand hover:bg-brand-deep mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-bold text-white"
        >
          返回全部學生
        </Link>
      </Card>
    );
  const filterKey = `${query.classId ?? ""}:${query.status ?? ""}:${query.search ?? ""}`;
  return (
    <>
      {canManageStudents && (
        <div className="mb-4 flex justify-end">
          <StudentRosterEditor
            classOptions={result.classOptions}
            canManageClasses={canManageClasses}
          />
        </div>
      )}
      <StudentSummary result={result} />
      {result.selectedClass && <SelectedClassBanner selectedClass={result.selectedClass} />}
      <Card className="mt-5 overflow-hidden">
        <StudentFilters key={filterKey} query={query} classOptions={result.classOptions} />
        {result.rows.length ? (
          <StudentTable
            rows={result.rows}
            classId={query.classId}
            classOptions={result.classOptions}
            canManageStudents={canManageStudents}
            canManageClasses={canManageClasses}
          />
        ) : (
          <div className="p-16 text-center text-slate-500">這個篩選條件目前沒有學生</div>
        )}
        <div className="border-t p-4 text-xs text-slate-500">
          顯示 {result.rows.length} 筆，共 {result.pagination.total} 筆
        </div>
      </Card>
    </>
  );
}
