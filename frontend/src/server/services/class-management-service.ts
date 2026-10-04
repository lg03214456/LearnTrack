import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ClassAggregateInput,
  ClassCommandResult,
  ClassLifecycle,
} from "@/features/classes/class-management.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { classManagementStore, classReferenceData } from "@/server/data/mock/class-management";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { RepositoryError } from "@/server/repositories/repository-error";
import { supabaseClassManagementRepository } from "@/server/repositories/class-management-supabase";

const mockSubjectPrefixes: Record<string, string> = {
  math: "MAT",
  english: "ENG",
  physics: "PHY",
  biology: "BIO",
};

const createClassCommandFailure = (
  code: ClassCommandResult["code"],
  message: string,
  values?: ClassAggregateInput,
  fieldErrors?: Record<string, string>,
): ClassCommandResult => ({ ok: false, code, message, values, fieldErrors });
const canManageClasses = (actor: AuthorizationContext) =>
  actor.scope.kind === "organization-wide" && can(actor, "classes.manage");
function validateClassInput(
  input: ClassAggregateInput,
  actor: AuthorizationContext,
  existingId?: string,
) {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (!name) errors.name = "請輸入班級名稱";
  if (!input.subjectIds.length) errors.subjectIds = "請至少選擇一個科目";
  if (!input.allGrades && !input.gradeIds.length) errors.gradeIds = "請至少選擇一個年級或全年級";
  if (input.capacity !== null && (!Number.isInteger(input.capacity) || input.capacity <= 0))
    errors.capacity = "人數上限必須是正整數";
  if (!classReferenceData.teachers.some((x) => x.id === input.teacherId))
    errors.teacherId = "請選擇有效教師";
  if (input.subjectIds.some((id) => !classReferenceData.subjects.some((x) => x.id === id)))
    errors.subjectIds = "科目包含無效選項";
  if (input.gradeIds.some((id) => !classReferenceData.grades.some((x) => x.id === id)))
    errors.gradeIds = "年級包含無效選項";
  if (input.studentIds.some((id) => !classReferenceData.students.some((x) => x.id === id)))
    errors.studentIds = "學生包含無效選項";
  if (new Set(input.studentIds).size !== input.studentIds.length)
    errors.studentIds = "學生不可重複";
  if (input.capacity !== null && input.studentIds.length > input.capacity)
    errors.studentIds = "學生人數超過班級上限";
  if (
    classManagementStore.classes.some(
      (x) =>
        x.organizationId === actor.organizationId &&
        x.id !== existingId &&
        x.name.trim().toLowerCase() === name.toLowerCase(),
    )
  )
    errors.name = "同一機構已有相同班級名稱";
  const seen = new Set<string>();
  for (const slot of input.schedules) {
    const key = `${slot.weekday}-${slot.startTime}-${slot.endTime}`;
    if (
      slot.weekday < 0 ||
      slot.weekday > 6 ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) ||
      slot.endTime <= slot.startTime
    )
      errors.schedules = "請檢查星期與起訖時間";
    if (seen.has(key)) errors.schedules = "排課時段不可重複";
    seen.add(key);
  }
  return errors;
}
function normalizeClassInput(input: ClassAggregateInput): ClassAggregateInput {
  return {
    ...input,
    name: input.name.trim(),
    code: input.code.trim(),
    subjectIds: [...new Set(input.subjectIds)],
    gradeIds: input.allGrades ? [] : [...new Set(input.gradeIds)],
    studentIds: [...new Set(input.studentIds)],
    schedules: input.schedules
      .map((x) => ({ ...x, room: x.room.trim() }))
      .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
  };
}
function buildClassAggregate(classId: string): ClassAggregateInput {
  const record = classManagementStore.classes.find((x) => x.id === classId)!;
  return {
    classId,
    revision: record.revision,
    name: record.name,
    code: record.code,
    type: record.type,
    subjectIds: classManagementStore.subjects
      .filter((x) => x.classId === classId)
      .map((x) => x.subjectId),
    gradeIds: classManagementStore.grades
      .filter((x) => x.classId === classId && x.gradeId !== "all")
      .map((x) => x.gradeId),
    allGrades: classManagementStore.grades.some(
      (x) => x.classId === classId && x.gradeId === "all",
    ),
    teacherId: classManagementStore.teachers.find((x) => x.classId === classId)?.teacherId ?? "",
    capacity: record.capacity,
    status: record.status,
    schedules: classManagementStore.schedules
      .filter((x) => x.classId === classId)
      .map(({ weekday, startTime, endTime, room }) => ({ weekday, startTime, endTime, room })),
    studentIds: classManagementStore.enrollments
      .filter((x) => x.classId === classId && x.status === "active")
      .map((x) => x.studentId),
  };
}
export function createClass(
  actor: AuthorizationContext,
  input: ClassAggregateInput,
): ClassCommandResult {
  if (!canManageClasses(actor))
    return createClassCommandFailure("FORBIDDEN", "無權建立班級", input);
  const value = normalizeClassInput(input),
    errors = validateClassInput(value, actor);
  if (Object.keys(errors).length)
    return createClassCommandFailure("VALIDATION_ERROR", "請修正班級資料", value, errors);
  const classId = classManagementStore.nextId();
  const prefix =
    value.subjectIds.length === 1 ? (mockSubjectPrefixes[value.subjectIds[0]] ?? "GEN") : "MIX";
  const nextNumber =
    Math.max(
      0,
      ...classManagementStore.classes
        .filter(
          (item) =>
            item.organizationId === actor.organizationId && item.code.startsWith(`${prefix}-`),
        )
        .map((item) => Number(item.code.match(/-(\d+)$/)?.[1] ?? 0)),
    ) + 1;
  value.code = `${prefix}-${String(nextNumber).padStart(4, "0")}`;
  classManagementStore.replaceClass(
    {
      id: classId,
      organizationId: actor.organizationId,
      name: value.name,
      code: value.code,
      type: value.type,
      capacity: value.capacity,
      status: value.status,
      progress: 0,
      revision: 1,
    },
    value.subjectIds,
    value.allGrades ? ["all"] : value.gradeIds,
    value.teacherId,
    value.schedules,
    value.studentIds,
  );
  return {
    ok: true,
    code: "OK",
    message: "班級已建立",
    values: { ...value, classId, revision: 1 },
  };
}
export function updateClass(
  actor: AuthorizationContext,
  input: ClassAggregateInput,
): ClassCommandResult {
  if (!input.classId) return createClassCommandFailure("VALIDATION_ERROR", "缺少班級識別", input);
  const record = classManagementStore.classes.find(
    (x) => x.id === input.classId && x.organizationId === actor.organizationId,
  );
  if (!record || !can(actor, "classes.manage") || !canAccessClass(actor, record.id))
    return createClassCommandFailure("FORBIDDEN", "無權修改班級", input);
  if (input.revision !== record.revision)
    return createClassCommandFailure("CONFLICT", "班級已被更新，請重新整理", input);
  const value = normalizeClassInput(input),
    errors = validateClassInput(value, actor, record.id);
  if (Object.keys(errors).length)
    return createClassCommandFailure("VALIDATION_ERROR", "請修正班級資料", value, errors);
  value.code = record.code;
  const hasOrganizationManagementScope = canManageClasses(actor),
    teacherId = hasOrganizationManagementScope
      ? value.teacherId
      : (classManagementStore.teachers.find((x) => x.classId === record.id)?.teacherId ??
        value.teacherId),
    status = hasOrganizationManagementScope ? value.status : record.status;
  classManagementStore.replaceClass(
    {
      ...record,
      name: value.name,
      code: value.code,
      type: value.type,
      capacity: value.capacity,
      status,
      revision: record.revision + 1,
    },
    value.subjectIds,
    value.allGrades ? ["all"] : value.gradeIds,
    teacherId,
    value.schedules,
    value.studentIds,
  );
  return {
    ok: true,
    code: "OK",
    message: "班級已更新",
    values: { ...value, teacherId, status, revision: record.revision + 1 },
  };
}
export function changeClassLifecycle(
  actor: AuthorizationContext,
  classId: string,
  revision: number,
  status: Extract<ClassLifecycle, "completed" | "archived">,
): ClassCommandResult {
  const record = classManagementStore.classes.find(
    (x) => x.id === classId && x.organizationId === actor.organizationId,
  );
  if (!record || !canManageClasses(actor))
    return createClassCommandFailure("FORBIDDEN", "無權變更班級狀態");
  if (record.revision !== revision)
    return createClassCommandFailure("CONFLICT", "班級已被更新，請重新整理");
  const value = buildClassAggregate(classId);
  classManagementStore.replaceClass(
    { ...record, status, revision: record.revision + 1 },
    value.subjectIds,
    value.allGrades ? ["all"] : value.gradeIds,
    value.teacherId,
    value.schedules,
    value.studentIds,
  );
  return { ok: true, code: "OK", message: status === "archived" ? "班級已封存" : "班級已結業" };
}
export function enrollStudents(
  actor: AuthorizationContext,
  classId: string,
  revision: number,
  studentIds: string[],
): ClassCommandResult {
  if (!classManagementStore.classes.some((x) => x.id === classId))
    return createClassCommandFailure("NOT_FOUND", "找不到班級");
  const value = buildClassAggregate(classId);
  return updateClass(actor, {
    ...value,
    revision,
    studentIds: [...new Set([...value.studentIds, ...studentIds])],
  });
}
export function withdrawStudent(
  actor: AuthorizationContext,
  classId: string,
  revision: number,
  studentId: string,
): ClassCommandResult {
  if (!classManagementStore.classes.some((x) => x.id === classId))
    return createClassCommandFailure("NOT_FOUND", "找不到班級");
  const value = buildClassAggregate(classId);
  return updateClass(actor, {
    ...value,
    revision,
    studentIds: value.studentIds.filter((x) => x !== studentId),
  });
}

function classPersistenceFailure(error: unknown, values?: ClassAggregateInput): ClassCommandResult {
  if (error instanceof RepositoryError) {
    if (error.code === "FORBIDDEN")
      return createClassCommandFailure("FORBIDDEN", "無權管理班級", values);
    if (error.code === "NOT_FOUND")
      return createClassCommandFailure("NOT_FOUND", "找不到班級", values);
    if (error.code === "INVALID_RELATIONSHIP")
      return createClassCommandFailure("VALIDATION_ERROR", "教師、學生或排課資料無效", values);
    if (error.code === "PERSISTENCE_UNAVAILABLE")
      return createClassCommandFailure("CONFLICT", "班級資料暫時無法儲存，請稍後再試", values);
  }
  return createClassCommandFailure("CONFLICT", "班級已被更新，請重新整理", values);
}

async function validateSupabaseClassInput(
  actor: AuthorizationContext,
  input: ClassAggregateInput,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "請輸入班級名稱";
  if (!input.subjectIds.length) errors.subjectIds = "請至少選擇一個科目";
  if (!input.allGrades && !input.gradeIds.length) errors.gradeIds = "請至少選擇一個年級或全年級";
  if (input.capacity !== null && (!Number.isInteger(input.capacity) || input.capacity <= 0))
    errors.capacity = "人數上限必須是正整數";
  if (input.capacity !== null && new Set(input.studentIds).size > input.capacity)
    errors.studentIds = "學生人數超過班級上限";
  const editor = await supabaseClassManagementRepository.editor(actor, input.classId);
  if (!editor && input.classId) return { classId: "找不到班級" };
  if (editor) {
    if (input.teacherId && !editor.teacherOptions.some((option) => option.id === input.teacherId))
      errors.teacherId = "請選擇有效教師";
    if (input.subjectIds.some((id) => !editor.subjectOptions.some((option) => option.id === id)))
      errors.subjectIds = "科目包含無效選項";
    if (input.gradeIds.some((id) => !editor.gradeOptions.some((option) => option.id === id)))
      errors.gradeIds = "年級包含無效選項";
    if (input.studentIds.some((id) => !editor.studentOptions.some((option) => option.id === id)))
      errors.studentIds = "學生包含無效選項";
  }
  const seen = new Set<string>();
  for (const slot of input.schedules) {
    const key = `${slot.weekday}-${slot.startTime}-${slot.endTime}`;
    if (
      slot.weekday < 0 ||
      slot.weekday > 6 ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) ||
      slot.endTime <= slot.startTime
    )
      errors.schedules = "請檢查星期與起訖時間";
    if (seen.has(key)) errors.schedules = "排課時段不可重複";
    seen.add(key);
  }
  return errors;
}

export async function saveClassWithConfiguredRepository(
  actor: AuthorizationContext,
  rawInput: ClassAggregateInput,
): Promise<ClassCommandResult> {
  if (authRuntimeConfig().domainDataProvider === "mock")
    return rawInput.classId ? updateClass(actor, rawInput) : createClass(actor, rawInput);
  if (!canManageClasses(actor))
    return createClassCommandFailure("FORBIDDEN", "無權管理班級", rawInput);
  const input = normalizeClassInput(rawInput);
  if (input.classId && !input.revision)
    return createClassCommandFailure("CONFLICT", "班級已被更新，請重新整理", input);
  try {
    const errors = await validateSupabaseClassInput(actor, input);
    if (Object.keys(errors).length)
      return createClassCommandFailure("VALIDATION_ERROR", "請修正班級資料", input, errors);
    const saved = await supabaseClassManagementRepository.save(actor, input);
    if (!saved) return createClassCommandFailure("CONFLICT", "班級資料未完成儲存", input);
    return {
      ok: true,
      code: "OK",
      message: input.classId ? "班級已更新" : "班級已建立",
      values: { ...input, classId: saved.class_id, revision: saved.revision },
    };
  } catch (error) {
    return classPersistenceFailure(error, input);
  }
}

export async function changeClassLifecycleWithConfiguredRepository(
  actor: AuthorizationContext,
  classId: string,
  revision: number,
  status: Extract<ClassLifecycle, "completed" | "archived">,
): Promise<ClassCommandResult> {
  if (authRuntimeConfig().domainDataProvider === "mock")
    return changeClassLifecycle(actor, classId, revision, status);
  if (!canManageClasses(actor)) return createClassCommandFailure("FORBIDDEN", "無權變更班級狀態");
  try {
    const editor = await supabaseClassManagementRepository.editor(actor, classId);
    if (!editor) return createClassCommandFailure("NOT_FOUND", "找不到班級");
    if (editor.initial.revision !== revision)
      return createClassCommandFailure("CONFLICT", "班級已被更新，請重新整理");
    return saveClassWithConfiguredRepository(actor, { ...editor.initial, status });
  } catch (error) {
    return classPersistenceFailure(error);
  }
}
