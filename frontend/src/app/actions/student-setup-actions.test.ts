import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readStudentSetupAction,
  readStudentLearningSetupAction,
  saveStudentSetupBasicAction,
} from "./student-setup-actions";
import { getAuthorizationContext } from "@/server/auth/identity";
import { studentRosterRepository } from "@/server/repositories/student-roster";
import { curriculumRepository } from "@/server/repositories/curriculum";
import { examRangeRepository } from "@/server/repositories/exam-ranges";
import { saveStudentRosterStateAction } from "./student-roster-actions";
import { RepositoryError } from "@/server/repositories/repository-error";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
vi.mock("@/server/auth/identity", () => ({ getAuthorizationContext: vi.fn() }));
vi.mock("@/server/repositories/student-roster", () => ({
  studentRosterRepository: { listStudents: vi.fn() },
}));
vi.mock("@/server/repositories/curriculum", () => ({
  curriculumRepository: { studentPlans: vi.fn() },
}));
vi.mock("@/server/repositories/exam-ranges", () => ({ examRangeRepository: { read: vi.fn() } }));
vi.mock("./student-roster-actions", () => ({ saveStudentRosterStateAction: vi.fn() }));
const owner: AuthorizationContext = {
  actorType: "organization",
  organizationId: "A",
  membershipId: "member",
  profileId: "owner",
  name: "測試",
  email: "test@example.test",
  roleId: "owner",
  roleName: "Owner",
  status: "active",
  permissions: ["students.manage", "classes.manage", "study_plans.read", "study_plans.manage"],
  scope: { kind: "organization-wide" },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAuthorizationContext).mockResolvedValue(owner);
});
describe("student setup scoped reads", () => {
  it("never loads plans or ranges for the basic step and scopes one student's record", async () => {
    vi.mocked(studentRosterRepository.listStudents).mockResolvedValue({
      rows: [
        {
          id: "student",
          organizationId: "A",
          number: "STU-0001",
          name: "測試",
          gender: "女",
          phone: "0912345678",
          status: "active",
          revision: 4,
          classes: [{ classId: "class", className: "測試班" }],
        },
      ],
      classOptions: [],
    } as unknown as Awaited<ReturnType<typeof studentRosterRepository.listStudents>>);
    const result = await readStudentSetupAction("student");
    expect(result.status).toBe("ready");
    expect(studentRosterRepository.listStudents).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "A", accessibleStudentIds: ["student"] }),
    );
    expect(curriculumRepository.studentPlans).not.toHaveBeenCalled();
    expect(examRangeRepository.read).not.toHaveBeenCalled();
  });
  it("denies a student from another organization rather than starting a create intent", async () => {
    vi.mocked(studentRosterRepository.listStudents).mockResolvedValue({
      rows: [],
      classOptions: [],
    } as unknown as Awaited<ReturnType<typeof studentRosterRepository.listStudents>>);
    expect((await readStudentSetupAction("B-student")).status).toBe("forbidden");
  });
  it.each([
    null,
    { ...owner, permissions: [] },
    { ...owner, scope: { kind: "assigned-classes", classIds: ["class"] } },
    { ...owner, actorType: "platform" },
  ])("rejects unauthorized setup access", async (actor) => {
    vi.mocked(getAuthorizationContext).mockResolvedValue(actor as AuthorizationContext);
    expect((await readStudentSetupAction()).status).toBe("forbidden");
    expect(studentRosterRepository.listStudents).not.toHaveBeenCalled();
  });
  it("rejects changed membership before writing", async () => {
    const previous = {
      ok: false,
      code: "OK",
      message: "",
      values: { name: "", number: "", gender: "女", phone: "", status: "active" },
    } as const;
    expect((await saveStudentSetupBasicAction("B:member", previous, new FormData())).code).toBe(
      "FORBIDDEN",
    );
    expect(saveStudentRosterStateAction).not.toHaveBeenCalled();
  });
  it("does not query ranges when the student scope is refused", async () => {
    vi.mocked(curriculumRepository.studentPlans).mockResolvedValue(undefined);
    const result = await readStudentLearningSetupAction("B-student", "A:member");
    expect(result.plans.status).toBe("forbidden");
    expect(examRangeRepository.read).not.toHaveBeenCalled();
  });
  it("distinguishes unavailable ranges from missing configuration and keeps plans", async () => {
    vi.mocked(curriculumRepository.studentPlans).mockResolvedValue({
      student: { id: "student", name: "測試", number: "STU-0001" },
      plans: [],
      terms: [],
      availableVersions: [],
    });
    vi.mocked(examRangeRepository.read).mockRejectedValue(
      new RepositoryError("PERSISTENCE_UNAVAILABLE"),
    );
    const result = await readStudentLearningSetupAction("student", "A:member");
    expect(result.plans.status).toBe("ready");
    expect(result.ranges.status).toBe("unavailable");
    expect(curriculumRepository.studentPlans).toHaveBeenCalledTimes(1);
    expect(examRangeRepository.read).toHaveBeenCalledTimes(1);
  });
  it("reports range permission denial without displaying it as an empty range", async () => {
    vi.mocked(curriculumRepository.studentPlans).mockResolvedValue({
      student: { id: "student", name: "測試", number: "STU-0001" },
      plans: [],
      terms: [],
      availableVersions: [],
    });
    vi.mocked(examRangeRepository.read).mockRejectedValue(new RepositoryError("FORBIDDEN"));
    expect((await readStudentLearningSetupAction("student", "A:member")).ranges.status).toBe(
      "forbidden",
    );
  });
});
