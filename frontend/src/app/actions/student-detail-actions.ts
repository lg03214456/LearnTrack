"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import {
  correctAssessmentResult,
  recordAssessmentResult,
  updateStudentProfile,
} from "@/server/services/student-detail-service";
import type { CommandResult } from "@/features/access-control/access-control.types";

const field = (data: FormData, key: string) => String(data.get(key) ?? "");
const finish = (studentId: string, result: { ok: boolean; message: string }) => {
  revalidatePath(`/students/${studentId}`);
  redirect(
    `/students/${studentId}?notice=${encodeURIComponent(result.message)}&tone=${result.ok ? "success" : "error"}`,
  );
};
export async function updateStudentProfileAction(data: FormData) {
  const actor = await getAuthorizationContext();
  const studentId = field(data, "studentId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "student.changed",
      resourceType: "student",
      resourceId: studentId,
      metadata: { changedFields: "profile-fields" },
    },
    mutate: () =>
      updateStudentProfile(actor, {
        studentId,
        phone: field(data, "phone"),
        school: field(data, "school"),
        grade: field(data, "grade"),
        guardianId: field(data, "guardianId"),
        guardianName: field(data, "guardianName"),
        guardianPhone: field(data, "guardianPhone"),
        revision: Number(data.get("revision")),
      }),
  });
  finish(studentId, outcome);
}
export async function recordAssessmentResultAction(data: FormData) {
  const actor = await getAuthorizationContext();
  const studentId = field(data, "studentId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "assessment.changed",
      resourceType: "student-assessment",
      resourceId: studentId,
    },
    mutate: () =>
      recordAssessmentResult(actor, {
        studentId,
        assessmentId: field(data, "assessmentId"),
        score: Number(data.get("score")),
        comment: field(data, "comment"),
      }),
  });
  finish(studentId, outcome);
}
export async function correctAssessmentResultAction(data: FormData) {
  const actor = await getAuthorizationContext();
  const studentId = field(data, "studentId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "assessment.changed",
      resourceType: "student-assessment",
      resourceId: studentId,
    },
    mutate: () =>
      correctAssessmentResult(actor, {
        resultId: field(data, "resultId"),
        score: Number(data.get("score")),
        comment: field(data, "comment"),
        revision: Number(data.get("revision")),
      }),
  });
  finish(studentId, outcome);
}

export interface AssessmentFormState extends CommandResult {
  values: { assessmentId: string; score: string; comment: string };
}
const state = (outcome: CommandResult, data: FormData): AssessmentFormState => ({
  ...outcome,
  values: {
    assessmentId: field(data, "assessmentId"),
    score: field(data, "score"),
    comment: field(data, "comment"),
  },
});
export async function recordAssessmentResultStateAction(
  _: AssessmentFormState,
  data: FormData,
): Promise<AssessmentFormState> {
  const actor = await getAuthorizationContext();
  const studentId = field(data, "studentId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "assessment.changed",
      resourceType: "student-assessment",
      resourceId: studentId,
    },
    mutate: () =>
      recordAssessmentResult(actor, {
        studentId,
        assessmentId: field(data, "assessmentId"),
        score: Number(data.get("score")),
        comment: field(data, "comment"),
      }),
  });
  if (outcome.ok) revalidatePath(`/students/${studentId}`);
  return state(outcome, data);
}
export async function correctAssessmentResultStateAction(
  _: AssessmentFormState,
  data: FormData,
): Promise<AssessmentFormState> {
  const actor = await getAuthorizationContext();
  const studentId = field(data, "studentId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "assessment.changed",
      resourceType: "student-assessment",
      resourceId: studentId,
    },
    mutate: () =>
      correctAssessmentResult(actor, {
        resultId: field(data, "resultId"),
        score: Number(data.get("score")),
        comment: field(data, "comment"),
        revision: Number(data.get("revision")),
      }),
  });
  if (outcome.ok) revalidatePath(`/students/${studentId}`);
  return state(outcome, data);
}
