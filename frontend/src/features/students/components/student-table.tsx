import Link from "next/link";
import { Status } from "@/components/ui";
import type { StudentListRow } from "../student-roster.types";
import type { StudentClassOption } from "../student-roster.types";
import { StudentRosterEditor } from "./student-roster-editor";
import { StudentLifecycleControl } from "./student-lifecycle-control";
export function StudentTable({
  rows,
  classId,
  classOptions,
  canManageStudents,
  canManageClasses,
}: {
  rows: StudentListRow[];
  classId?: string;
  classOptions: StudentClassOption[];
  canManageStudents: boolean;
  canManageClasses: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>學生姓名</th>
            <th>學號</th>
            <th>所屬班級</th>
            <th>性別</th>
            <th>聯絡電話</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link
                  href={`/students/${row.id}${classId ? `?classId=${encodeURIComponent(classId)}` : ""}`}
                  className="flex items-center gap-3 hover:text-teal-700"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-teal-700 font-bold text-white">
                    {row.name[0]}
                  </span>
                  <b>{row.name}</b>
                </Link>
              </td>
              <td>{row.number}</td>
              <td>
                <div className="flex max-w-72 flex-wrap gap-1">
                  {row.classes.map((courseClass) => (
                    <span
                      key={courseClass.classId}
                      className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700"
                    >
                      {courseClass.className}
                    </span>
                  ))}
                </div>
              </td>
              <td>{row.gender}</td>
              <td>{row.phone}</td>
              <td>
                <Status value={row.status} />
              </td>
              <td>
                {canManageStudents ? (
                  <div className="flex items-center gap-2">
                    {row.status !== "archived" && (
                      <StudentRosterEditor
                        row={row}
                        classOptions={classOptions}
                        canManageClasses={canManageClasses}
                      />
                    )}
                    <StudentLifecycleControl row={row} />
                  </div>
                ) : (
                  <Link
                    href={`/students/${row.id}`}
                    className="text-sm font-bold text-teal-800 hover:underline"
                  >
                    查看
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
