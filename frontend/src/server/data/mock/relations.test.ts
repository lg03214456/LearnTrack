import { describe, expect, it } from "vitest";
import { classRows, students } from "./fixtures";
import {
  assessmentResults,
  assessments,
  attendanceRecords,
  enrollments,
  lessonProgress,
} from "./relations";

describe("relational fixtures", () => {
  it("resolves every foreign key", () => {
    const studentIds = new Set(students.map(({ id }) => id));
    const classIds = new Set(classRows.map(({ id }) => id));
    const assessmentIds = new Set(assessments.map(({ id }) => id));
    expect(
      enrollments.every((row) => studentIds.has(row.studentId) && classIds.has(row.classId)),
    ).toBe(true);
    expect(
      attendanceRecords.every((row) => studentIds.has(row.studentId) && classIds.has(row.classId)),
    ).toBe(true);
    expect(
      lessonProgress.every((row) => studentIds.has(row.studentId) && classIds.has(row.classId)),
    ).toBe(true);
    expect(
      assessmentResults.every(
        (row) => studentIds.has(row.studentId) && assessmentIds.has(row.assessmentId),
      ),
    ).toBe(true);
  });
  it("includes a multi-class student", () =>
    expect(
      enrollments.filter((row) => row.studentId === "stu-1" && row.status === "active"),
    ).toHaveLength(2));
});
