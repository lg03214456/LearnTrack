"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ClassAggregateInput,
  ClassCommandResult,
  ClassLifecycle,
  ClassType,
  WeeklyScheduleSlot,
} from "@/features/classes/class-management.types";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import {
  changeClassLifecycle,
  createClass,
  updateClass,
} from "@/server/services/class-management-service";
const types: ClassType[] = ["progress", "individual", "study"],
  statuses: ClassLifecycle[] = ["recruiting", "active", "completed", "archived"];
function parse(form: FormData): ClassAggregateInput {
  let schedules: WeeklyScheduleSlot[] = [];
  try {
    const raw = JSON.parse(String(form.get("schedules") ?? "[]"));
    if (Array.isArray(raw))
      schedules = raw.map((x) => ({
        weekday: Number(x.weekday),
        startTime: String(x.startTime ?? ""),
        endTime: String(x.endTime ?? ""),
        room: String(x.room ?? ""),
      }));
  } catch {
    schedules = [];
  }
  const type = String(form.get("type"));
  const status = String(form.get("status"));
  const capacity = String(form.get("capacity") ?? "").trim();
  return {
    classId: String(form.get("classId") ?? "") || undefined,
    revision: Number(form.get("revision") ?? 0) || undefined,
    name: String(form.get("name") ?? ""),
    code: String(form.get("code") ?? ""),
    type: types.includes(type as ClassType) ? (type as ClassType) : "progress",
    subjectIds: form.getAll("subjectIds").map(String),
    gradeIds: form.getAll("gradeIds").map(String),
    allGrades: form.get("allGrades") === "on",
    teacherId: String(form.get("teacherId") ?? ""),
    capacity: capacity ? Number(capacity) : null,
    status: statuses.includes(status as ClassLifecycle) ? (status as ClassLifecycle) : "recruiting",
    schedules,
    studentIds: form.getAll("studentIds").map(String),
  };
}
export async function saveClassStateAction(
  _previous: ClassCommandResult,
  form: FormData,
): Promise<ClassCommandResult> {
  const input = parse(form);
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor) return { ok: false, code: "FORBIDDEN", message: "請重新登入", values: input };
  const result = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "class.changed",
      resourceType: "class",
      resourceId: input.classId,
      metadata: { changedFields: input.classId ? "class-fields" : "created" },
    },
    mutate: () => (input.classId ? updateClass(actor, input) : createClass(actor, input)),
  });
  if (!result.ok) return result;
  revalidatePath("/classes");
  revalidatePath("/students");
  revalidatePath("/attendance");
  redirect(`/classes/${result.values?.classId ?? input.classId}/edit?saved=1`);
}
export async function changeClassLifecycleAction(form: FormData) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor) return;
  const classId = String(form.get("classId") ?? ""),
    revision = Number(form.get("revision") ?? 0),
    status = String(form.get("status")) as "completed" | "archived";
  if (!["completed", "archived"].includes(status)) return;
  const result = await executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "lifecycle.changed",
      resourceType: "class",
      resourceId: classId,
      metadata: { nextStatus: status },
    },
    mutate: () => changeClassLifecycle(actor, classId, revision, status),
  });
  if (result.ok) {
    revalidatePath("/classes");
    revalidatePath("/attendance");
  }
}
