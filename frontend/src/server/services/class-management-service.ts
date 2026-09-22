import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ClassAggregateInput,
  ClassCommandResult,
  ClassLifecycle,
} from "@/features/classes/class-management.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { classManagementStore, classReferenceData } from "@/server/data/mock/class-management";

const fail = (
  code: ClassCommandResult["code"],
  message: string,
  values?: ClassAggregateInput,
  fieldErrors?: Record<string, string>,
): ClassCommandResult => ({ ok: false, code, message, values, fieldErrors });
const isManager = (actor: AuthorizationContext) =>
  actor.scope.kind === "organization-wide" && can(actor, "classes.manage");
function validate(input: ClassAggregateInput, actor: AuthorizationContext, existingId?: string) {
  const errors: Record<string, string> = {};
  const name = input.name.trim(),
    code = input.code.trim();
  if (!name) errors.name = "請輸入班級名稱";
  if (!code) errors.code = "請輸入班級代碼";
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
  if (
    classManagementStore.classes.some(
      (x) =>
        x.organizationId === actor.organizationId &&
        x.id !== existingId &&
        x.code.trim().toLowerCase() === code.toLowerCase(),
    )
  )
    errors.code = "同一機構已有相同班級代碼";
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
function normalize(input: ClassAggregateInput): ClassAggregateInput {
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
function aggregate(classId: string): ClassAggregateInput {
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
  if (!isManager(actor)) return fail("FORBIDDEN", "無權建立班級", input);
  const value = normalize(input),
    errors = validate(value, actor);
  if (Object.keys(errors).length) return fail("VALIDATION_ERROR", "請修正班級資料", value, errors);
  const classId = classManagementStore.nextId();
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
  if (!input.classId) return fail("VALIDATION_ERROR", "缺少班級識別", input);
  const record = classManagementStore.classes.find(
    (x) => x.id === input.classId && x.organizationId === actor.organizationId,
  );
  if (!record || !can(actor, "classes.manage") || !canAccessClass(actor, record.id))
    return fail("FORBIDDEN", "無權修改班級", input);
  if (input.revision !== record.revision)
    return fail("CONFLICT", "班級已被更新，請重新整理", input);
  const value = normalize(input),
    errors = validate(value, actor, record.id);
  if (Object.keys(errors).length) return fail("VALIDATION_ERROR", "請修正班級資料", value, errors);
  const manager = isManager(actor),
    teacherId = manager
      ? value.teacherId
      : (classManagementStore.teachers.find((x) => x.classId === record.id)?.teacherId ??
        value.teacherId),
    status = manager ? value.status : record.status;
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
  if (!record || !isManager(actor)) return fail("FORBIDDEN", "無權變更班級狀態");
  if (record.revision !== revision) return fail("CONFLICT", "班級已被更新，請重新整理");
  const value = aggregate(classId);
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
    return fail("NOT_FOUND", "找不到班級");
  const value = aggregate(classId);
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
    return fail("NOT_FOUND", "找不到班級");
  const value = aggregate(classId);
  return updateClass(actor, {
    ...value,
    revision,
    studentIds: value.studentIds.filter((x) => x !== studentId),
  });
}
