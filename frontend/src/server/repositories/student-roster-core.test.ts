import { describe, expect, it } from "vitest";
import { classRows, ORG, students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { buildStudentListResult } from "./student-roster-core";

const source = { students, classes: classRows, enrollments };
describe("student roster repository contract", () => {
  it("returns unique organization students and reconciled metrics", () => {
    const result = buildStudentListResult({ organizationId: ORG, page: 1, pageSize: 20 }, source);
    expect(result.rows).toHaveLength(6);
    expect(result.rows.filter((row) => row.id === "stu-1")).toHaveLength(1);
    expect(result.rows.find((row) => row.id === "stu-1")?.classes).toHaveLength(2);
    expect(result.summary.totalStudents).toBe(6);
    expect(result.summary.activeStudents + result.summary.leaveStudents).toBe(6);
  });
  it("filters one class with search and status", () => {
    const result = buildStudentListResult(
      {
        organizationId: ORG,
        classId: "cls-1",
        search: "王",
        status: "leave",
        page: 1,
        pageSize: 20,
      },
      source,
    );
    expect(result.rows.map((row) => row.id)).toEqual(["stu-3"]);
    expect(result.selectedClass?.name).toBe("國中數學 A班");
    expect(result.summary.totalStudents).toBe(3);
  });
  it("shows the multi-class student in either class", () => {
    for (const classId of ["cls-1", "cls-2"])
      expect(
        buildStudentListResult(
          { organizationId: ORG, classId, page: 1, pageSize: 20 },
          source,
        ).rows.some((row) => row.id === "stu-1"),
      ).toBe(true);
  });
  it("fails closed for an unavailable class", () => {
    const result = buildStudentListResult(
      { organizationId: ORG, classId: "other-org-class", page: 1, pageSize: 20 },
      source,
    );
    expect(result.state).toBe("unavailable-class");
    expect(result.rows).toEqual([]);
    expect(result.selectedClass).toBeUndefined();
  });
  it("normalizes malformed pagination", () => {
    const result = buildStudentListResult(
      { organizationId: ORG, page: Number.NaN, pageSize: -1 },
      source,
    );
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(20);
  });
  it("distinguishes available empty results", () => {
    const result = buildStudentListResult(
      { organizationId: ORG, classId: "cls-1", search: "不存在", page: 1, pageSize: 20 },
      source,
    );
    expect(result.state).toBe("ready");
    expect(result.rows).toEqual([]);
    expect(result.selectedClass?.id).toBe("cls-1");
  });
  it("hides archived students by default and retrieves them explicitly", () => {
    const archivedStudents = structuredClone(students);
    archivedStudents[0] = {
      ...archivedStudents[0],
      status: "archived",
      archivedAt: "2026-08-31T00:00:00.000Z",
      archivedBy: "owner",
      archiveReason: "長期停課",
    };
    const archivedSource = { ...source, students: archivedStudents };
    const defaultResult = buildStudentListResult(
      { organizationId: ORG, page: 1, pageSize: 20 },
      archivedSource,
    );
    const archivedResult = buildStudentListResult(
      { organizationId: ORG, status: "archived", page: 1, pageSize: 20 },
      archivedSource,
    );

    expect(defaultResult.rows.some((row) => row.id === "stu-1")).toBe(false);
    expect(defaultResult.summary.archivedStudents).toBe(1);
    expect(archivedResult.rows.map((row) => row.id)).toEqual(["stu-1"]);
  });
});
