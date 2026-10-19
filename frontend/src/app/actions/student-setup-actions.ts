"use server";

import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";
import { studentRosterRepository } from "@/server/repositories/student-roster";
import { curriculumRepository } from "@/server/repositories/curriculum";
import { examRangeRepository } from "@/server/repositories/exam-ranges";
import { RepositoryError } from "@/server/repositories/repository-error";
import type {
  SetupRead,
  StudentSetupData,
  StudentLearningSetup,
} from "@/features/students/student-setup.types";
import type { StudentRosterCommandResult } from "@/features/students/student-roster.types";
import { saveStudentRosterStateAction } from "./student-roster-actions";

export async function readStudentSetupAction(
  studentId?: string,
): Promise<SetupRead<StudentSetupData>> {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "students.manage") || actor.scope.kind !== "organization-wide")
    return { status: "forbidden", message: "沒有學生主檔設定權限，請重新確認登入身分。" };
  try {
    const result = await studentRosterRepository.listStudents({
      organizationId: actor.organizationId,
      accessibleStudentIds: studentId ? [studentId] : [],
      page: 1,
      pageSize: 1,
    });
    const row = result.rows.find((item) => item.id === studentId);
    if (studentId && !row) return { status: "forbidden", message: "學生不存在或無法存取。" };
    return {
      status: "ready",
      value: {
        contextKey: `${actor.organizationId}:${actor.membershipId}`,
        canManageClasses: can(actor, "classes.manage"),
        classOptions: result.classOptions,
        basic: row
          ? {
              studentId: row.id,
              revision: row.revision,
              number: row.number,
              name: row.name,
              gender: row.gender,
              phone: row.phone,
              status: row.status === "active" ? "active" : "leave",
              classIds: row.classes.map((item) => item.classId),
            }
          : { number: "", name: "", gender: "女", phone: "", status: "active", classIds: [] },
      },
    };
  } catch {
    return { status: "unavailable", message: "學生設定暫時無法載入，請稍後重試。" };
  }
}

export async function saveStudentSetupBasicAction(
  contextKey: string,
  previous: StudentRosterCommandResult,
  form: FormData,
): Promise<StudentRosterCommandResult> {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || contextKey !== `${actor.organizationId}:${actor.membershipId}`)
    return {
      ...previous,
      ok: false,
      code: "FORBIDDEN",
      message: "登入身分已變更，請關閉並重新開啟設定。",
    };
  return saveStudentRosterStateAction(previous, form);
}

export async function readStudentLearningSetupAction(
  studentId: string,
  contextKey: string,
): Promise<StudentLearningSetup> {
  const actor = await getAuthorizationContext().catch(() => null);
  const denied = { status: "forbidden", message: "無權讀取或登入身分已變更。" } as const;
  if (
    !actor ||
    contextKey !== `${actor.organizationId}:${actor.membershipId}` ||
    !can(actor, "study_plans.read")
  )
    return { plans: denied, ranges: denied, canManage: false };
  try {
    const plans = await curriculumRepository.studentPlans(actor, studentId);
    if (!plans) return { plans: denied, ranges: denied, canManage: false };
    let ranges: StudentLearningSetup["ranges"];
    try {
      ranges = { status: "ready", value: await examRangeRepository.read(actor, studentId) };
    } catch (error) {
      ranges =
        error instanceof RepositoryError && error.code === "FORBIDDEN"
          ? denied
          : { status: "unavailable", message: "段考範圍暫時無法載入，請確認既有段考 SQL 已套用。" };
    }
    return {
      plans: { status: "ready", value: plans },
      ranges,
      canManage: can(actor, "study_plans.manage"),
    };
  } catch (error) {
    if (error instanceof RepositoryError && error.code === "FORBIDDEN")
      return { plans: denied, ranges: denied, canManage: false };
    return {
      plans: { status: "unavailable", message: "教材設定暫時無法載入。" },
      ranges: { status: "unavailable", message: "請先重新載入教材設定。" },
      canManage: false,
    };
  }
}
