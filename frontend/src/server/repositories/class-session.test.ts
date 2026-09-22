import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classManagementStore } from "@/server/data/mock/class-management";
import { classSessionStore } from "@/server/data/mock/class-sessions";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { students } from "@/server/data/mock/fixtures";
import { classSessionRepository } from "./class-session";

describe("class session repository", () => {
  beforeEach(() => {
    classManagementStore.reset();
    classSessionStore.reset();
    curriculumStore.reset();
  });

  it("preserves an existing roster after enrollment changes", () => {
    const actor = resolveMockIdentity("owner");
    expect(classSessionRepository.open(actor, "cls-1", "2026-08-31")?.members).toHaveLength(3);
    classManagementStore.setStudentEnrollments("org-001", "stu-3", []);
    expect(classSessionRepository.open(actor, "cls-1", "2026-08-31")?.members).toHaveLength(3);
  });

  it("excludes archived students from a newly created session", () => {
    students.find((student) => student.id === "stu-3")!.status = "archived";
    const view = classSessionRepository.open(resolveMockIdentity("owner"), "cls-1", "2026-09-03");
    expect(view?.members.map((member) => member.studentId)).not.toContain("stu-3");
    students.find((student) => student.id === "stu-3")!.status = "leave";
  });

  it("returns no workspace outside teacher assignment", () => {
    expect(
      classSessionRepository.open(resolveMockIdentity("teacher"), "cls-2", "2026-09-01"),
    ).toBeUndefined();
  });
});
