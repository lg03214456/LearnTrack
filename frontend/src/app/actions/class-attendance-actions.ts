"use server";
import { revalidatePath } from "next/cache";
import type { DailyProgressCommandResult } from "@/features/class-sessions/class-session.types";
import { isClassAttendanceCommand } from "@/features/class-sessions/class-attendance";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import { saveClassAttendance } from "@/server/services/class-attendance-service";

export async function saveClassAttendanceAction(
  data: FormData,
): Promise<DailyProgressCommandResult> {
  const actor = await getAuthorizationContext();
  let command: unknown;
  try {
    command = JSON.parse(String(data.get("command") ?? ""));
  } catch {
    /* Invalid JSON is rejected below. */
  }
  if (!isClassAttendanceCommand(command))
    return { ok: false, code: "VALIDATION_ERROR", message: "無法解析點名資料" };
  const validatedCommand = command;
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "attendance.changed",
      resourceType: "class-session",
      resourceId: command.sessionId,
      metadata: { recordCount: command.entries.length },
    },
    mutate: () => saveClassAttendance(actor, validatedCommand),
  });
  if (outcome.ok) {
    revalidatePath("/classes/[classId]", "page");
    revalidatePath("/attendance");
    for (const entry of command.entries)
      revalidatePath(`/students/${encodeURIComponent(entry.studentId)}`);
  }
  return outcome;
}
