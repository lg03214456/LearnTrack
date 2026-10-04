import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classManagementStore } from "@/server/data/mock/class-management";
import { students } from "@/server/data/mock/fixtures";
import { studentProfileStore } from "@/server/data/mock/student-profile";
import { changeStudentLifecycle, saveStudentRoster } from "./student-roster-service";

const initialStudents = structuredClone(students);

beforeEach(() => {
  students.splice(0, students.length, ...structuredClone(initialStudents));
  classManagementStore.reset();
  studentProfileStore.reset();
});

afterEach(() => {
  students.splice(0, students.length, ...structuredClone(initialStudents));
  classManagementStore.reset();
  studentProfileStore.reset();
});

describe("student roster service", () => {
  it("automatically assigns the next organization student number", () => {
    const result = saveStudentRoster(resolveMockIdentity("owner"), {
      number: "",
      name: "自動編號學生",
      gender: "女",
      phone: "0912-000-998",
      status: "active",
    });

    expect(result).toMatchObject({ ok: true, values: { number: "STU-0007" } });
  });

  it("allows an organization manager to create a student and assign classes", () => {
    const result = saveStudentRoster(resolveMockIdentity("owner"), {
      number: "stu-0099",
      name: "新同學",
      gender: "女",
      phone: "0912-000-999",
      status: "active",
      classIds: ["cls-1"],
    });

    expect(result.ok).toBe(true);
    expect(result.values.number).toBe("STU-0099");
    expect(students.some((student) => student.id === result.values.studentId)).toBe(true);
    expect(
      studentProfileStore.profiles.some((profile) => profile.studentId === result.values.studentId),
    ).toBe(true);
    expect(
      classManagementStore.enrollments.some(
        (item) =>
          item.studentId === result.values.studentId &&
          item.classId === "cls-1" &&
          item.status === "active",
      ),
    ).toBe(true);
  });

  it("rejects roster management from a teacher even when the teacher can edit learning records", () => {
    const result = saveStudentRoster(resolveMockIdentity("teacher"), {
      number: "STU-0100",
      name: "未授權學生",
      gender: "男",
      phone: "0912-000-100",
      status: "active",
    });

    expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("prevents duplicate student numbers within the organization", () => {
    const result = saveStudentRoster(resolveMockIdentity("director"), {
      number: "stu-0001",
      name: "重複學號",
      gender: "女",
      phone: "0912-000-101",
      status: "active",
    });

    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(result.fieldErrors?.number).toBe("此學號已存在");
  });

  it("archives without deleting history and restores into leave status", () => {
    const owner = resolveMockIdentity("owner");
    const archived = changeStudentLifecycle(owner, "stu-1", "archive", "長期停課");

    expect(archived.ok).toBe(true);
    expect(students.find((student) => student.id === "stu-1")).toMatchObject({
      status: "archived",
      archiveReason: "長期停課",
      archivedBy: "owner",
    });
    expect(
      classManagementStore.enrollments.some(
        (item) => item.studentId === "stu-1" && item.status === "active",
      ),
    ).toBe(false);
    expect(studentProfileStore.profiles.some((profile) => profile.studentId === "stu-1")).toBe(
      true,
    );

    const restored = changeStudentLifecycle(owner, "stu-1", "restore", "");
    expect(restored.ok).toBe(true);
    expect(students.find((student) => student.id === "stu-1")?.status).toBe("leave");
  });

  it("requires a reason and management permission before archiving", () => {
    expect(
      changeStudentLifecycle(resolveMockIdentity("owner"), "stu-1", "archive", " "),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(
      changeStudentLifecycle(resolveMockIdentity("teacher"), "stu-1", "archive", "離班"),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});
