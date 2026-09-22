import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  StudentLifecycleCommandResult,
  StudentRosterCommandResult,
  StudentRosterInput,
} from "@/features/students/student-roster.types";
import { can } from "@/server/authorization/policy";
import { classManagementStore } from "@/server/data/mock/class-management";
import { students } from "@/server/data/mock/fixtures";
import { studentProfileStore } from "@/server/data/mock/student-profile";

const fail = (
  code: StudentRosterCommandResult["code"],
  message: string,
  values: StudentRosterInput,
  fieldErrors?: Record<string, string>,
): StudentRosterCommandResult => ({ ok: false, code, message, values, fieldErrors });

function normalize(input: StudentRosterInput): StudentRosterInput {
  return {
    ...input,
    number: input.number.trim().toUpperCase(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    classIds: input.classIds ? [...new Set(input.classIds)] : undefined,
  };
}

const lifecycleFail = (
  code: StudentLifecycleCommandResult["code"],
  message: string,
  values: StudentLifecycleCommandResult["values"],
  fieldErrors?: StudentLifecycleCommandResult["fieldErrors"],
): StudentLifecycleCommandResult => ({ ok: false, code, message, values, fieldErrors });

export function changeStudentLifecycle(
  actor: AuthorizationContext,
  studentId: string,
  intent: "archive" | "restore",
  rawReason: string,
): StudentLifecycleCommandResult {
  const reason = rawReason.trim();
  const values = { studentId, intent, reason };
  if (actor.scope.kind !== "organization-wide" || !can(actor, "students.manage"))
    return lifecycleFail("FORBIDDEN", "無權變更學生生命週期", values);
  const index = students.findIndex(
    (student) => student.id === studentId && student.organizationId === actor.organizationId,
  );
  if (index < 0) return lifecycleFail("NOT_FOUND", "找不到學生", values);
  const student = students[index];

  if (intent === "archive") {
    if (student.status === "archived") return lifecycleFail("CONFLICT", "學生已經封存", values);
    if (reason.length < 2)
      return lifecycleFail("VALIDATION_ERROR", "請填寫封存原因", values, {
        reason: "封存原因至少需要 2 個字",
      });
    students.splice(index, 1, {
      ...student,
      status: "archived",
      archivedAt: new Date().toISOString(),
      archivedBy: actor.profileId,
      archiveReason: reason,
    });
    classManagementStore.setStudentEnrollments(actor.organizationId, studentId, []);
    return { ok: true, code: "OK", message: "學生已封存", values };
  }

  if (student.status !== "archived")
    return lifecycleFail("CONFLICT", "學生目前不是封存狀態", values);
  students.splice(index, 1, {
    ...student,
    status: "leave",
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined,
  });
  return {
    ok: true,
    code: "OK",
    message: "學生已恢復為停課狀態，請確認是否重新加入班級",
    values,
  };
}

function validate(actor: AuthorizationContext, input: StudentRosterInput) {
  const fieldErrors: Record<string, string> = {};
  if (!input.number) fieldErrors.number = "請輸入學號";
  if (!input.name) fieldErrors.name = "請輸入學生姓名";
  if (!/^09\d{2}-?\d{3}-?\d{3}$/.test(input.phone)) fieldErrors.phone = "請輸入有效手機號碼";
  if (
    students.some(
      (student) =>
        student.organizationId === actor.organizationId &&
        student.id !== input.studentId &&
        student.number.toLowerCase() === input.number.toLowerCase(),
    )
  )
    fieldErrors.number = "此學號已存在";
  if (input.classIds) {
    const availableClasses = classManagementStore.classes.filter(
      (courseClass) => courseClass.organizationId === actor.organizationId,
    );
    if (input.classIds.some((classId) => !availableClasses.some((item) => item.id === classId)))
      fieldErrors.classIds = "班級選項無效";
    for (const classId of input.classIds) {
      const courseClass = availableClasses.find((item) => item.id === classId);
      const isAlreadyEnrolled = classManagementStore.enrollments.some(
        (item) =>
          item.classId === classId &&
          item.studentId === input.studentId &&
          item.status === "active",
      );
      const activeCount = classManagementStore.enrollments.filter(
        (item) => item.classId === classId && item.status === "active",
      ).length;
      if (
        courseClass &&
        courseClass.capacity !== null &&
        !isAlreadyEnrolled &&
        activeCount >= courseClass.capacity
      )
        fieldErrors.classIds = `${courseClass.name}已達人數上限`;
    }
  }
  return fieldErrors;
}

export function saveStudentRoster(
  actor: AuthorizationContext,
  rawInput: StudentRosterInput,
): StudentRosterCommandResult {
  const input = normalize(rawInput);
  if (actor.scope.kind !== "organization-wide" || !can(actor, "students.manage"))
    return fail("FORBIDDEN", "無權管理學生名單", input);
  if (input.classIds && !can(actor, "classes.manage"))
    return fail("FORBIDDEN", "無權調整學生班級", input);

  const fieldErrors = validate(actor, input);
  if (Object.keys(fieldErrors).length)
    return fail("VALIDATION_ERROR", "請修正學生資料", input, fieldErrors);

  const existingIndex = input.studentId
    ? students.findIndex(
        (student) =>
          student.id === input.studentId && student.organizationId === actor.organizationId,
      )
    : -1;
  if (input.studentId && existingIndex < 0) return fail("NOT_FOUND", "找不到學生", input);

  const studentId = input.studentId ?? `stu-${Date.now().toString(36)}`;
  const record = {
    id: studentId,
    organizationId: actor.organizationId,
    number: input.number,
    name: input.name,
    gender: input.gender,
    phone: input.phone,
    status: input.status,
  };
  if (existingIndex >= 0) students.splice(existingIndex, 1, record);
  else students.push(record);

  const profile = studentProfileStore.profiles.find(
    (item) => item.studentId === studentId && item.organizationId === actor.organizationId,
  );
  if (profile) studentProfileStore.updateProfile({ ...profile, phone: input.phone });
  else
    studentProfileStore.addProfile({
      studentId,
      organizationId: actor.organizationId,
      phone: input.phone,
      school: "未設定",
      grade: "未設定",
      revision: 1,
    });

  if (input.classIds)
    classManagementStore.setStudentEnrollments(actor.organizationId, studentId, input.classIds);

  return {
    ok: true,
    code: "OK",
    message: input.studentId ? "學生設定已更新" : "學生已新增",
    values: { ...input, studentId },
  };
}
