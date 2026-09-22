import { describe, expect, it } from "vitest";
import { attendanceRows, classRows, ORG, progressRows, students } from "./fixtures";

describe("mock data integrity", () => {
  it("keeps organization-owned records scoped", () =>
    expect([...students, ...classRows].every((record) => record.organizationId === ORG)).toBe(
      true,
    ));
  it("resolves student references", () => {
    const ids = new Set(students.map((student) => student.id));
    expect(progressRows.every((row) => ids.has(row.studentId))).toBe(true);
    expect(attendanceRows.every((row) => ids.has(row.studentId))).toBe(true);
  });
});
