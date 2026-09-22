"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveClassStateAction } from "@/app/actions/class-management-actions";
import type {
  ClassCommandResult,
  ClassEditorView,
  WeeklyScheduleSlot,
} from "../class-management.types";
import { ClassBasicFields } from "./class-basic-fields";
import { ClassScheduleFields } from "./class-schedule-fields";
import { ClassStudentSelector } from "./class-student-selector";

const initialState: ClassCommandResult = { ok: false, code: "OK", message: "" };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-teal-800 px-5 py-2.5 font-bold text-white disabled:opacity-50"
    >
      {pending ? "儲存中…" : "儲存班級"}
    </button>
  );
}

export function ClassEditor({ view }: { view: ClassEditorView }) {
  const [state, action] = useActionState(saveClassStateAction, initialState);
  const values = state.values ?? view.initial;
  const [schedules, setSchedules] = useState<WeeklyScheduleSlot[]>(values.schedules);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(values.studentIds);
  const students = useMemo(
    () =>
      view.studentOptions.filter(
        (student) =>
          student.label.includes(studentSearch) ||
          student.number.toLowerCase().includes(studentSearch.toLowerCase()),
      ),
    [studentSearch, view.studentOptions],
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="classId" value={values.classId ?? ""} />
      <input type="hidden" name="revision" value={values.revision ?? ""} />
      <input type="hidden" name="schedules" value={JSON.stringify(schedules)} />
      {selectedStudentIds.map((studentId) => (
        <input key={studentId} type="hidden" name="studentIds" value={studentId} />
      ))}
      <ClassBasicFields view={view} values={values} fieldErrors={state.fieldErrors} />
      <ClassScheduleFields
        schedules={schedules}
        setSchedules={setSchedules}
        fieldErrors={state.fieldErrors}
      />
      <ClassStudentSelector
        students={students}
        search={studentSearch}
        setSearch={setStudentSearch}
        selectedStudentIds={selectedStudentIds}
        setSelectedStudentIds={setSelectedStudentIds}
        fieldErrors={state.fieldErrors}
      />
      {state.message && (
        <p
          role="status"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Link href="/classes" className="rounded-lg border px-5 py-2.5 font-bold">
          取消
        </Link>
        <Submit />
      </div>
    </form>
  );
}
