import { describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { classRows, students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { studentProfileStore } from "@/server/data/mock/student-profile";
import {
  buildStudentDetail,
  canAccessStudent,
  type StudentDetailSource,
} from "./student-detail-core";

const source = (): StudentDetailSource => ({
  students,
  classes: classRows,
  enrollments,
  profiles: studentProfileStore.profiles,
  guardians: studentProfileStore.guardians,
  assessments: studentProfileStore.assessments,
  results: studentProfileStore.results,
  sessions: studentProfileStore.sessions,
  terms: curriculumStore.terms,
});

describe("student detail builder", () => {
  it("enforces organization and assigned-class scope", () => {
    expect(canAccessStudent(resolveMockIdentity("teacher"), "stu-1", source())).toBe(true);
    expect(canAccessStudent(resolveMockIdentity("teacher"), "stu-4", source())).toBe(false);
    expect(
      canAccessStudent(
        { ...resolveMockIdentity("owner"), organizationId: "other" },
        "stu-1",
        source(),
      ),
    ).toBe(false);
  });
  it("composes profile, guardians and multiple classes", () => {
    const detail = buildStudentDetail(
      resolveMockIdentity("owner"),
      "stu-1",
      { page: 1, pageSize: 20 },
      source(),
    )!;
    expect(detail.profile.guardians[0].name).toBe("陳媽媽");
    expect(detail.profile.classes).toHaveLength(2);
  });
  it("orders session history and resolves its class dimension", () => {
    const detail = buildStudentDetail(
      resolveMockIdentity("owner"),
      "stu-1",
      { page: 1, pageSize: 20 },
      source(),
    )!;
    expect(detail.sessions.map((session) => session.date)).toEqual([
      "2026-08-24",
      "2026-08-22",
      "2026-08-20",
      "2026-08-15",
    ]);
    expect(detail.sessions[0].className).toBe("國中數學 A班");
  });
  it("orders, filters and normalizes mixed maximum scores", () => {
    const detail = buildStudentDetail(
      resolveMockIdentity("owner"),
      "stu-1",
      { subject: "數學", page: 1, pageSize: 20 },
      source(),
    )!;
    expect(detail.assessment.rows.map((row) => row.date)).toEqual(["2026-08-19", "2026-08-05"]);
    expect(detail.assessment.rows[0].percentage).toBe(92);
    expect(detail.assessment.summary.averagePercentage).toBe(90);
  });
  it("keeps every filtered assessment available for export regardless of pagination", () => {
    const detail = buildStudentDetail(
      resolveMockIdentity("owner"),
      "stu-1",
      { page: 1, pageSize: 1 },
      source(),
    )!;
    expect(detail.assessment.rows).toHaveLength(1);
    expect(detail.assessment.exportRows).toHaveLength(3);
  });
  it("returns a distinct empty history", () => {
    const detail = buildStudentDetail(
      resolveMockIdentity("owner"),
      "stu-2",
      { subject: "英文", page: 1, pageSize: 20 },
      source(),
    )!;
    expect(detail.assessment.rows).toEqual([]);
    expect(detail.assessment.summary.averagePercentage).toBeNull();
  });
});
