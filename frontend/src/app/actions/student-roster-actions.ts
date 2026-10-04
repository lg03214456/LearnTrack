"use server";

import { revalidatePath } from "next/cache";
import type {
  StudentLifecycleCommandResult,
  StudentRosterCommandResult,
  StudentRosterInput,
} from "@/features/students/student-roster.types";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import {
  changeStudentLifecycleWithConfiguredRepository,
  saveStudentRosterWithConfiguredRepository,
} from "@/server/services/student-roster-service";

export async function saveStudentRosterStateAction(
  _previous: StudentRosterCommandResult,
  form: FormData,
): Promise<StudentRosterCommandResult> {
  const gender = String(form.get("gender"));
  const status = String(form.get("status"));
  const includesClassManagement = form.get("includesClassManagement") === "true";
  const input: StudentRosterInput = {
    studentId: String(form.get("studentId") ?? "") || undefined,
    revision: Number(form.get("revision") ?? 0) || undefined,
    number: String(form.get("number") ?? ""),
    name: String(form.get("name") ?? ""),
    gender: gender === "男" ? "男" : "女",
    phone: String(form.get("phone") ?? ""),
    status: status === "leave" ? "leave" : "active",
    classIds: includesClassManagement ? form.getAll("classIds").map(String) : undefined,
  };
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor) return { ok: false, code: "FORBIDDEN", message: "請重新登入", values: input };
  const result = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "student.changed",
      resourceType: "student",
      resourceId: input.studentId,
      metadata: { changedFields: input.studentId ? "profile-fields" : "created" },
    },
    mutate: () => saveStudentRosterWithConfiguredRepository(actor, input),
  });
  if (result.ok) {
    revalidatePath("/students");
    revalidatePath(`/students/${result.values.studentId}`);
    revalidatePath("/classes");
    revalidatePath("/attendance");
  }
  return result;
}

export async function changeStudentLifecycleStateAction(
  _previous: StudentLifecycleCommandResult,
  form: FormData,
): Promise<StudentLifecycleCommandResult> {
  const intent: "archive" | "restore" = form.get("intent") === "restore" ? "restore" : "archive";
  const values: StudentLifecycleCommandResult["values"] = {
    studentId: String(form.get("studentId") ?? ""),
    revision: Number(form.get("revision") ?? 0) || undefined,
    intent,
    reason: String(form.get("reason") ?? ""),
  };
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor) return { ok: false, code: "FORBIDDEN", message: "請重新登入", values };
  const result = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "lifecycle.changed",
      resourceType: "student",
      resourceId: values.studentId,
      metadata: { nextStatus: intent === "archive" ? "archived" : "active" },
    },
    mutate: () =>
      changeStudentLifecycleWithConfiguredRepository(
        actor,
        values.studentId,
        values.revision,
        intent,
        values.reason,
      ),
  });
  if (result.ok) {
    revalidatePath("/students");
    revalidatePath(`/students/${values.studentId}`);
    revalidatePath("/classes");
    revalidatePath("/attendance");
    revalidatePath("/progress");
  }
  return result;
}
