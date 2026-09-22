"use server";

import { executeAuditedMutation } from "@/server/audit/audit-service";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { canAccessStudent } from "@/server/authorization/policy";

export async function auditStudentExportAction(
  studentId: string,
  exportType: "sessions" | "assessments",
  recordCount: number,
) {
  const actor = await getAuthorizationContext();
  if (!canAccessStudent(actor, studentId)) return false;
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "export.created",
      resourceType: `student-${exportType}-csv`,
      resourceId: studentId,
      metadata: { recordCount },
    },
    mutate: () => ({ ok: true as const }),
  });
  return outcome.ok;
}
