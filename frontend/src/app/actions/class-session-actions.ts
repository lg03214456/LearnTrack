"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  DailyProgressCommandResult,
  DailyProgressEntryInput,
} from "@/features/class-sessions/class-session.types";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import {
  appendCompletedProgress,
  completeClassSession,
  correctDailyProgress,
  saveDailyProgress,
} from "@/server/services/class-session-service";

const field = (data: FormData, key: string) => String(data.get(key) ?? "");
const invalid = (message: string): DailyProgressCommandResult => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message,
});

function parseEntries(data: FormData): DailyProgressEntryInput[] | undefined {
  try {
    const value = JSON.parse(field(data, "entries"));
    if (!Array.isArray(value)) return;
    return value.map((entry) => ({
      sessionMemberId: String(entry.sessionMemberId ?? ""),
      studentId: String(entry.studentId ?? ""),
      studyPlanId: String(entry.studyPlanId ?? ""),
      learningItemId: String(entry.learningItemId ?? ""),
      learningItemRevision: Number(entry.learningItemRevision),
      status: String(entry.status) as DailyProgressEntryInput["status"],
      note: String(entry.note ?? ""),
    }));
  } catch {
    return;
  }
}

export async function openClassSessionAction(data: FormData) {
  const actor = await getAuthorizationContext();
  const classId = field(data, "classId");
  const date = field(data, "date");
  if (!actor || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  redirect(`/classes/${encodeURIComponent(classId)}?date=${encodeURIComponent(date)}`);
}

export async function saveDailyProgressAction(
  _: DailyProgressCommandResult,
  data: FormData,
): Promise<DailyProgressCommandResult> {
  const entries = parseEntries(data);
  if (!entries) return invalid("無法解析進度資料");
  const actor = await getAuthorizationContext();
  const sessionId = field(data, "sessionId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "progress.changed",
      resourceType: "class-session",
      resourceId: sessionId,
      metadata: { recordCount: entries.length },
    },
    mutate: () =>
      saveDailyProgress(actor, {
        sessionId,
        sessionRevision: Number(data.get("sessionRevision")),
        entries,
      }),
  });
  if (outcome.ok) {
    revalidatePath(`/classes/${field(data, "classId")}`);
    for (const studentId of new Set(entries.map((entry) => entry.studentId)))
      revalidatePath(`/students/${studentId}`);
  }
  return outcome;
}

export async function appendCompletedProgressAction(
  _: DailyProgressCommandResult,
  data: FormData,
): Promise<DailyProgressCommandResult> {
  const entries = parseEntries(data);
  if (!entries) return invalid("無法解析進度資料");
  const actor = await getAuthorizationContext();
  const sessionId = field(data, "sessionId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "progress.changed",
      resourceType: "class-session",
      resourceId: sessionId,
      metadata: { recordCount: entries.length },
    },
    mutate: () =>
      appendCompletedProgress(actor, {
        sessionId,
        sessionRevision: Number(data.get("sessionRevision")),
        entries,
        reason: field(data, "reason"),
      }),
  });
  if (outcome.ok) {
    revalidatePath(`/classes/${field(data, "classId")}`);
    for (const studentId of new Set(entries.map((entry) => entry.studentId)))
      revalidatePath(`/students/${studentId}`);
  }
  return outcome;
}

export async function completeClassSessionAction(data: FormData) {
  const actor = await getAuthorizationContext();
  const classId = field(data, "classId");
  const sessionId = field(data, "sessionId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "attendance.changed",
      resourceType: "class-session",
      resourceId: sessionId,
    },
    mutate: () => completeClassSession(actor, sessionId, Number(data.get("sessionRevision"))),
  });
  revalidatePath(`/classes/${classId}`);
  redirect(
    `/classes/${classId}?date=${encodeURIComponent(field(data, "date"))}&notice=${encodeURIComponent(outcome.message)}&tone=${outcome.ok ? "success" : "error"}`,
  );
}

export async function correctDailyProgressAction(data: FormData) {
  const actor = await getAuthorizationContext();
  const classId = field(data, "classId");
  const progressId = field(data, "progressId");
  const outcome = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "progress.changed",
      resourceType: "student-progress",
      resourceId: progressId,
    },
    mutate: () =>
      correctDailyProgress(actor, {
        progressId,
        revision: Number(data.get("revision")),
        status: field(data, "status") as "pending" | "in_progress" | "completed",
        note: field(data, "note"),
        reason: field(data, "reason"),
      }),
  });
  revalidatePath(`/classes/${classId}`);
  redirect(
    `/classes/${classId}?date=${encodeURIComponent(field(data, "date"))}&notice=${encodeURIComponent(outcome.message)}&tone=${outcome.ok ? "success" : "error"}`,
  );
}
