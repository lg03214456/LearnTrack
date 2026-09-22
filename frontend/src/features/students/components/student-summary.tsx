import { AlertCircle, Archive, Building2, UserCheck, Users } from "lucide-react";
import type { StudentListResult } from "../student-roster.types";
import { Metric } from "@/components/ui";

export function StudentSummary({ result }: { result: StudentListResult }) {
  const isClass = Boolean(result.selectedClass);
  const { summary } = result;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric
        label={isClass ? "班級學生數" : "學生總數"}
        value={`${summary.totalStudents}位`}
        icon={Users}
      />
      <Metric label="在籍學生" value={`${summary.activeStudents}位`} icon={UserCheck} />
      <Metric label="停課學生" value={`${summary.leaveStudents}位`} icon={AlertCircle} tone="red" />
      <Metric label="已封存" value={`${summary.archivedStudents}位`} icon={Archive} tone="blue" />
      <Metric
        label={isClass ? "班級容量" : "班級總數"}
        value={
          isClass
            ? summary.contextTotal === null
              ? "無上限"
              : `${summary.contextTotal}位`
            : `${summary.contextTotal}班`
        }
        icon={Building2}
        tone="blue"
      />
    </div>
  );
}
