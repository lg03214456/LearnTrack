import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStudentSetupPlanAction, createPlanAction } from "./curriculum-actions";
import { getAuthorizationContext } from "@/server/auth/identity";
import { curriculumRepository } from "@/server/repositories/curriculum";
import { createAndActivatePlan } from "@/server/services/curriculum-persistence-service";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({ getAuthorizationContext: vi.fn() }));
vi.mock("@/server/auth/providers", () => ({ getAuthProviders: () => ({ audit: {} }) }));
vi.mock("@/server/audit/audit-service", () => ({ executeAuditedMutation: vi.fn() }));
vi.mock("@/server/repositories/curriculum", () => ({
  curriculumRepository: { studentPlans: vi.fn() },
}));
vi.mock("@/server/services/curriculum-persistence-service", () => ({
  createAndActivatePlan: vi.fn(),
}));
const actor = {
  actorType: "organization",
  organizationId: "A",
  membershipId: "member",
} as AuthorizationContext;
const command = {
  studentId: "student",
  termId: "term",
  versionId: "version",
  contextKey: "A:member",
  confirmedReplacement: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAuthorizationContext).mockResolvedValue(actor);
  vi.mocked(curriculumRepository.studentPlans).mockResolvedValue({
    student: { id: "student", name: "測試", number: "STU-0001" },
    plans: [],
    availableVersions: [{ id: "version", label: "已發布教材", subjectId: "math" }],
    terms: [{ id: "term", name: "本學期" }],
  });
  vi.mocked(createAndActivatePlan).mockResolvedValue({ ok: true, code: "OK", message: "已儲存" });
  vi.mocked(executeAuditedMutation).mockImplementation(async (options) => options.mutate());
});
describe("nonredirecting plan setup action", () => {
  it("shares the audited service boundary and refreshes without redirect", async () => {
    expect((await saveStudentSetupPlanAction(command)).ok).toBe(true);
    expect(createAndActivatePlan).toHaveBeenCalledWith(actor, {
      studentId: "student",
      termId: "term",
      versionId: "version",
    });
    expect(executeAuditedMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          organizationId: "A",
          action: "curriculum.changed",
          resourceId: "student",
        }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/students/student");
    expect(redirect).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation for the same semester and subject", async () => {
    const snapshot = await curriculumRepository.studentPlans(actor, "student");
    vi.mocked(curriculumRepository.studentPlans).mockResolvedValue({
      ...snapshot!,
      plans: [{ id: "old", status: "active", termId: "term", subjectId: "math" }] as NonNullable<
        typeof snapshot
      >["plans"],
    });
    expect((await saveStudentSetupPlanAction(command)).code).toBe("CONFLICT");
    expect(createAndActivatePlan).not.toHaveBeenCalled();
    expect((await saveStudentSetupPlanAction({ ...command, confirmedReplacement: true })).ok).toBe(
      true,
    );
  });
  it("rejects changed membership and unpublished or inaccessible versions", async () => {
    expect((await saveStudentSetupPlanAction({ ...command, contextKey: "B:member" })).code).toBe(
      "FORBIDDEN",
    );
    expect((await saveStudentSetupPlanAction({ ...command, versionId: "draft" })).code).toBe(
      "VALIDATION_ERROR",
    );
    expect(createAndActivatePlan).not.toHaveBeenCalled();
  });
  it("does not refresh on a service conflict or forbidden result", async () => {
    for (const code of ["CONFLICT", "FORBIDDEN"] as const) {
      vi.mocked(createAndActivatePlan).mockResolvedValue({ ok: false, code, message: "拒絕" });
      expect((await saveStudentSetupPlanAction(command)).code).toBe(code);
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("does not claim success or redirect after audit failure", async () => {
    vi.mocked(executeAuditedMutation).mockRejectedValue(new Error("AUDIT_UNAVAILABLE"));
    await expect(saveStudentSetupPlanAction(command)).rejects.toThrow("AUDIT_UNAVAILABLE");
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
  it("preserves the independent redirecting action", async () => {
    const form = new FormData();
    for (const key of ["studentId", "termId", "versionId"] as const) form.set(key, command[key]);
    await createPlanAction(form);
    expect(createAndActivatePlan).toHaveBeenCalledWith(actor, {
      studentId: "student",
      termId: "term",
      versionId: "version",
    });
    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining("/students/student?tab=plans&notice="),
    );
  });
});
