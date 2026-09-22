import { describe, expect, it } from "vitest";
import { personaPermissionMatrix } from "@/features/access-control/persona-experiences";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { can, canAccessClass, canAccessStudent, canManageOwner } from "./policy";
describe("persona authorization contracts", () => {
  it("keeps governance and daily operations distinct", () => {
    expect(personaPermissionMatrix.owner).toContain("roles.manage");
    expect(personaPermissionMatrix.owner).toContain("credentials.force_reset");
    expect(personaPermissionMatrix.owner).toContain("audit.read");
    expect(personaPermissionMatrix.director).toContain("accounts.manage");
    expect(personaPermissionMatrix.director).toContain("credentials.change_self");
    expect(personaPermissionMatrix.director).not.toContain("credentials.force_reset");
    expect(personaPermissionMatrix.director).not.toContain("roles.manage");
    expect(personaPermissionMatrix.teacher).not.toContain("classes.manage");
  });
  it("derives trusted scopes for all five personas", () => {
    expect(resolveMockIdentity("owner").scope.kind).toBe("organization-wide");
    expect(resolveMockIdentity("director").scope.kind).toBe("organization-wide");
    expect(resolveMockIdentity("teacher").scope).toEqual({
      kind: "assigned-classes",
      classIds: ["cls-1"],
    });
    expect(resolveMockIdentity("student").scope).toEqual({
      kind: "self-student",
      studentId: "stu-1",
    });
    expect(resolveMockIdentity("parent").scope).toEqual({
      kind: "linked-students",
      studentIds: ["stu-1"],
    });
  });
  it("rejects unrelated class, student, and Owner targets", () => {
    const teacher = resolveMockIdentity("teacher"),
      student = resolveMockIdentity("student"),
      parent = resolveMockIdentity("parent"),
      director = resolveMockIdentity("director");
    expect(canAccessClass(teacher, "cls-1")).toBe(true);
    expect(canAccessClass(teacher, "cls-2")).toBe(false);
    expect(canAccessStudent(student, "stu-1")).toBe(true);
    expect(canAccessStudent(student, "stu-2")).toBe(false);
    expect(canAccessStudent(parent, "stu-1")).toBe(true);
    expect(canAccessStudent(parent, "stu-2")).toBe(false);
    expect(canManageOwner(director)).toBe(false);
    expect(canManageOwner(resolveMockIdentity("owner"))).toBe(true);
    expect(can(student, "student_profiles.manage")).toBe(false);
    expect(can(parent, "assessment_history.manage")).toBe(false);
  });
});
