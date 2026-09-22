import { Card } from "@/components/ui";
import type { Dispatch, SetStateAction } from "react";
import type { ClassCommandResult, ClassEditorView } from "../class-management.types";

export function ClassStudentSelector({
  students,
  search,
  setSearch,
  selectedStudentIds,
  setSelectedStudentIds,
  fieldErrors,
}: {
  students: ClassEditorView["studentOptions"];
  search: string;
  setSearch: (value: string) => void;
  selectedStudentIds: string[];
  setSelectedStudentIds: Dispatch<SetStateAction<string[]>>;
  fieldErrors?: ClassCommandResult["fieldErrors"];
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">加入學生（可選）</h2>
      <input
        aria-label="搜尋可加入學生"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="搜尋姓名或學號"
        className="input mt-3 w-full"
      />
      <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
        {students.map((student) => (
          <label key={student.id} className="rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={selectedStudentIds.includes(student.id)}
              onChange={(event) =>
                setSelectedStudentIds((current) =>
                  event.target.checked
                    ? [...current, student.id]
                    : current.filter((studentId) => studentId !== student.id),
                )
              }
              className="mr-2"
            />
            <b>{student.label}</b>
            <span className="ml-2 text-xs text-slate-500">{student.number}</span>
          </label>
        ))}
      </div>
      <small className="text-red-600">{fieldErrors?.studentIds}</small>
    </Card>
  );
}
