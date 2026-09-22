import { afterEach, describe, expect, it } from "vitest";
import type { ClassAggregateInput } from "@/features/classes/class-management.types";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classManagementStore } from "@/server/data/mock/class-management";
import {
  changeClassLifecycle,
  createClass,
  enrollStudents,
  updateClass,
  withdrawStudent,
} from "./class-management-service";
const input: ClassAggregateInput = {
  name: "測試班",
  code: "TEST-1",
  type: "progress",
  subjectIds: ["math"],
  gradeIds: ["j1"],
  allGrades: false,
  teacherId: "teacher",
  capacity: 10,
  status: "active",
  schedules: [{ weekday: 2, startTime: "18:30", endTime: "20:30", room: "201" }],
  studentIds: ["stu-1"],
};
afterEach(() => classManagementStore.reset());
describe("class management service", () => {
  it("creates a complete aggregate for managers", () => {
    expect(createClass(resolveMockIdentity("owner"), input).ok).toBe(true);
  });
  it("rejects invalid or unauthorized creation", () => {
    expect(createClass(resolveMockIdentity("teacher"), input).code).toBe("FORBIDDEN");
    expect(createClass(resolveMockIdentity("owner"), { ...input, name: "" }).code).toBe(
      "VALIDATION_ERROR",
    );
  });
  it("keeps class configuration unavailable to teachers", () => {
    expect(
      updateClass(resolveMockIdentity("teacher"), { ...input, classId: "cls-1", revision: 1 }).code,
    ).toBe("FORBIDDEN");
  });
  it("adds and withdraws enrollments with capacity checks", () => {
    const owner = resolveMockIdentity("owner");
    expect(enrollStudents(owner, "cls-3", 1, ["stu-5"]).ok).toBe(true);
    expect(withdrawStudent(owner, "cls-3", 2, "stu-6").ok).toBe(true);
  });
  it("restricts lifecycle changes to managers", () => {
    expect(changeClassLifecycle(resolveMockIdentity("teacher"), "cls-1", 1, "archived").code).toBe(
      "FORBIDDEN",
    );
    expect(changeClassLifecycle(resolveMockIdentity("owner"), "cls-1", 1, "completed").ok).toBe(
      true,
    );
  });
});
