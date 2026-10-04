import type { AttendanceDayView, AttendanceRow } from "@/features/attendance/attendance.types";
import type { ExpectedAttendanceClass } from "@/features/classes/class-management.types";

export function buildAttendanceDayView(
  expected: ExpectedAttendanceClass[],
  existingRows: AttendanceRow[],
  classId?: string,
): AttendanceDayView {
  const selectedClasses = classId ? expected.filter((row) => row.classId === classId) : expected;
  const rows = selectedClasses
    .flatMap((row) => row.students)
    .filter(
      (student, index, array) =>
        array.findIndex((candidate) => candidate.studentId === student.studentId) === index,
    )
    .map((student) => {
      const existing = existingRows.find((row) => row.studentId === student.studentId);
      return {
        ...student,
        status: existing?.status ?? ("present" as const),
        note: existing?.note ?? "",
      };
    });

  return {
    rows,
    classOptions: expected.map((row) => ({ id: row.classId, name: row.className })),
  };
}
