import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  StudentLifecycleCommandResult,
  StudentRosterCommandResult,
  StudentRosterInput,
} from "@/features/students/student-roster.types";
import { can } from "@/server/authorization/policy";
import {
  studentRosterMutationRepository,
  type StudentRosterMutationRepository,
} from "@/server/repositories/student-roster-mutations";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { RepositoryError } from "@/server/repositories/repository-error";
import { supabaseStudentRosterRepository } from "@/server/repositories/student-roster-supabase";

const createStudentRosterFailure = (
  code: StudentRosterCommandResult["code"],
  message: string,
  values: StudentRosterInput,
  fieldErrors?: Record<string, string>,
): StudentRosterCommandResult => ({ ok: false, code, message, values, fieldErrors });

function normalizeStudentRosterInput(input: StudentRosterInput): StudentRosterInput {
  return {
    ...input,
    number: input.number.trim().toUpperCase(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    classIds: input.classIds ? [...new Set(input.classIds)] : undefined,
  };
}

const createStudentLifecycleFailure = (
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
  repository: StudentRosterMutationRepository = studentRosterMutationRepository,
): StudentLifecycleCommandResult {
  const reason = rawReason.trim();
  const values = { studentId, intent, reason };
  if (actor.scope.kind !== "organization-wide" || !can(actor, "students.manage"))
    return createStudentLifecycleFailure("FORBIDDEN", "無權變更學生生命週期", values);
  const student = repository.findStudent(actor.organizationId, studentId);
  if (!student) return createStudentLifecycleFailure("NOT_FOUND", "找不到學生", values);

  if (intent === "archive") {
    if (student.status === "archived")
      return createStudentLifecycleFailure("CONFLICT", "學生已經封存", values);
    if (reason.length < 2)
      return createStudentLifecycleFailure("VALIDATION_ERROR", "請填寫封存原因", values, {
        reason: "封存原因至少需要 2 個字",
      });
    repository.saveStudent({
      ...student,
      status: "archived",
      archivedAt: new Date().toISOString(),
      archivedBy: actor.profileId,
      archiveReason: reason,
    });
    repository.setStudentEnrollments(actor.organizationId, studentId, []);
    return { ok: true, code: "OK", message: "學生已封存", values };
  }

  if (student.status !== "archived")
    return createStudentLifecycleFailure("CONFLICT", "學生目前不是封存狀態", values);
  repository.saveStudent({
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

function validateStudentRosterInput(
  actor: AuthorizationContext,
  input: StudentRosterInput,
  repository: StudentRosterMutationRepository,
) {
  const fieldErrors: Record<string, string> = {};
  if (input.studentId && !input.number) fieldErrors.number = "找不到學生學號";
  if (!input.name) fieldErrors.name = "請輸入學生姓名";
  if (!/^09\d{2}-?\d{3}-?\d{3}$/.test(input.phone)) fieldErrors.phone = "請輸入有效手機號碼";
  if (repository.hasStudentNumber(actor.organizationId, input.number, input.studentId))
    fieldErrors.number = "此學號已存在";
  if (input.classIds) {
    const availableClasses = repository.listClasses(actor.organizationId);
    if (input.classIds.some((classId) => !availableClasses.some((item) => item.id === classId)))
      fieldErrors.classIds = "班級選項無效";
    for (const classId of input.classIds) {
      const courseClass = availableClasses.find((item) => item.id === classId);
      const isAlreadyEnrolled = repository.isActivelyEnrolled(classId, input.studentId);
      const activeCount = repository.countActiveEnrollments(classId);
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
  repository: StudentRosterMutationRepository = studentRosterMutationRepository,
): StudentRosterCommandResult {
  const input = normalizeStudentRosterInput(rawInput);
  if (actor.scope.kind !== "organization-wide" || !can(actor, "students.manage"))
    return createStudentRosterFailure("FORBIDDEN", "無權管理學生名單", input);
  if (input.classIds && !can(actor, "classes.manage"))
    return createStudentRosterFailure("FORBIDDEN", "無權調整學生班級", input);

  const fieldErrors = validateStudentRosterInput(actor, input, repository);
  if (Object.keys(fieldErrors).length)
    return createStudentRosterFailure("VALIDATION_ERROR", "請修正學生資料", input, fieldErrors);

  const existingStudent = input.studentId
    ? repository.findStudent(actor.organizationId, input.studentId)
    : undefined;
  if (input.studentId && !existingStudent)
    return createStudentRosterFailure("NOT_FOUND", "找不到學生", input);

  const studentId = input.studentId ?? `stu-${Date.now().toString(36)}`;
  const studentNumber = input.number || repository.nextStudentNumber(actor.organizationId);
  const record = {
    id: studentId,
    organizationId: actor.organizationId,
    number: studentNumber,
    name: input.name,
    gender: input.gender,
    phone: input.phone,
    status: input.status,
  };
  repository.saveStudent(record);
  repository.updateStudentProfile(actor.organizationId, studentId, input.phone);

  if (input.classIds)
    repository.setStudentEnrollments(actor.organizationId, studentId, input.classIds);

  return {
    ok: true,
    code: "OK",
    message: input.studentId ? "學生設定已更新" : "學生已新增",
    values: { ...input, studentId, number: studentNumber },
  };
}

function persistenceFailure(
  error: unknown,
  values: StudentRosterInput,
): StudentRosterCommandResult {
  if (error instanceof RepositoryError) {
    if (error.code === "CONFLICT")
      return createStudentRosterFailure("CONFLICT", "學生資料已被更新，請重新整理", values);
    if (error.code === "FORBIDDEN")
      return createStudentRosterFailure("FORBIDDEN", "無權管理學生名單", values);
    if (error.code === "NOT_FOUND")
      return createStudentRosterFailure("NOT_FOUND", "找不到學生", values);
    if (error.code === "INVALID_RELATIONSHIP")
      return createStudentRosterFailure("VALIDATION_ERROR", "班級或學生資料無效", values);
  }
  return createStudentRosterFailure("CONFLICT", "學生資料暫時無法儲存，請稍後再試", values);
}

export async function saveStudentRosterWithConfiguredRepository(
  actor: AuthorizationContext,
  rawInput: StudentRosterInput,
): Promise<StudentRosterCommandResult> {
  if (authRuntimeConfig().domainDataProvider === "mock") return saveStudentRoster(actor, rawInput);
  const input = normalizeStudentRosterInput(rawInput);
  if (actor.scope.kind !== "organization-wide" || !can(actor, "students.manage"))
    return createStudentRosterFailure("FORBIDDEN", "無權管理學生名單", input);
  if (input.classIds && !can(actor, "classes.manage"))
    return createStudentRosterFailure("FORBIDDEN", "無權調整學生班級", input);
  const fieldErrors: Record<string, string> = {};
  if (input.studentId && !input.number) fieldErrors.number = "找不到學生學號";
  if (!input.name) fieldErrors.name = "請輸入學生姓名";
  if (!/^09\d{2}-?\d{3}-?\d{3}$/.test(input.phone)) fieldErrors.phone = "請輸入有效手機號碼";
  if (input.studentId && !input.revision)
    return createStudentRosterFailure("CONFLICT", "學生資料已被更新，請重新整理", input);
  if (Object.keys(fieldErrors).length)
    return createStudentRosterFailure("VALIDATION_ERROR", "請修正學生資料", input, fieldErrors);
  try {
    const saved = await supabaseStudentRosterRepository.saveStudent(actor.organizationId, input);
    if (!saved) return createStudentRosterFailure("CONFLICT", "學生資料未完成儲存", input);
    return {
      ok: true,
      code: "OK",
      message: input.studentId ? "學生設定已更新" : "學生已新增",
      values: { ...input, studentId: saved.student_id, revision: saved.revision },
    };
  } catch (error) {
    return persistenceFailure(error, input);
  }
}

export async function changeStudentLifecycleWithConfiguredRepository(
  actor: AuthorizationContext,
  studentId: string,
  revision: number | undefined,
  intent: "archive" | "restore",
  rawReason: string,
): Promise<StudentLifecycleCommandResult> {
  if (authRuntimeConfig().domainDataProvider === "mock")
    return changeStudentLifecycle(actor, studentId, intent, rawReason);
  const reason = rawReason.trim();
  const values = { studentId, revision, intent, reason };
  if (actor.scope.kind !== "organization-wide" || !can(actor, "students.manage"))
    return createStudentLifecycleFailure("FORBIDDEN", "無權變更學生生命週期", values);
  if (!revision)
    return createStudentLifecycleFailure("CONFLICT", "學生資料已被更新，請重新整理", values);
  if (intent === "archive" && reason.length < 2)
    return createStudentLifecycleFailure("VALIDATION_ERROR", "請填寫封存原因", values, {
      reason: "封存原因至少需要 2 個字",
    });
  try {
    const saved = await supabaseStudentRosterRepository.changeLifecycle(
      actor.organizationId,
      studentId,
      revision,
      intent,
      reason,
    );
    if (!saved) return createStudentLifecycleFailure("CONFLICT", "學生狀態未完成儲存", values);
    return {
      ok: true,
      code: "OK",
      message: intent === "archive" ? "學生已封存" : "學生已恢復為停課狀態，請確認是否重新加入班級",
      values: { ...values, revision: saved.revision },
    };
  } catch (error) {
    if (error instanceof RepositoryError) {
      if (error.code === "FORBIDDEN")
        return createStudentLifecycleFailure("FORBIDDEN", "無權變更學生生命週期", values);
      if (error.code === "NOT_FOUND")
        return createStudentLifecycleFailure("NOT_FOUND", "找不到學生", values);
      if (error.code === "INVALID_RELATIONSHIP")
        return createStudentLifecycleFailure("VALIDATION_ERROR", "學生狀態無效", values);
    }
    return createStudentLifecycleFailure("CONFLICT", "學生資料已被更新，請重新整理", values);
  }
}
