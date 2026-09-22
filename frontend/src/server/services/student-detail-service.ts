import type {
  AuthorizationContext,
  CommandResult,
} from "@/features/access-control/access-control.types";
import type {
  CorrectAssessmentResultCommand,
  RecordAssessmentResultCommand,
  UpdateStudentProfileCommand,
} from "@/features/student-profile/student-profile.types";
import { can } from "@/server/authorization/policy";
import { classRows, students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { studentProfileStore } from "@/server/data/mock/student-profile";
import { canAccessStudent } from "@/server/repositories/student-detail-core";

const response = (ok: boolean, code: CommandResult["code"], message: string): CommandResult => ({
  ok,
  code,
  message,
});
const source = () => ({
  students,
  classes: classRows,
  enrollments,
  profiles: studentProfileStore.profiles,
  guardians: studentProfileStore.guardians,
  assessments: studentProfileStore.assessments,
  results: studentProfileStore.results,
  sessions: studentProfileStore.sessions,
  terms: [],
});
const accessible = (actor: AuthorizationContext, studentId: string) =>
  canAccessStudent(actor, studentId, source());
const clean = (value: string) => value.trim();

export function updateStudentProfile(
  actor: AuthorizationContext,
  command: UpdateStudentProfileCommand,
): CommandResult {
  if (!can(actor, "student_profiles.manage"))
    return response(false, "FORBIDDEN", "你沒有編輯學生個資的權限");
  if (!accessible(actor, command.studentId))
    return response(false, "NOT_FOUND", "找不到可管理的學生");
  const student = students.find(
    (x) => x.id === command.studentId && x.organizationId === actor.organizationId,
  );
  const profile = studentProfileStore.profiles.find(
    (x) => x.studentId === command.studentId && x.organizationId === actor.organizationId,
  );
  const guardian = studentProfileStore.guardians.find(
    (x) =>
      x.id === command.guardianId &&
      x.studentId === command.studentId &&
      x.organizationId === actor.organizationId,
  );
  if (!student || !profile || !guardian)
    return response(false, "NOT_FOUND", "學生或家長資料不存在");
  if (profile.revision !== command.revision)
    return response(false, "CONFLICT", "資料已被更新，請重新整理後再試");
  if (
    !clean(command.phone) ||
    !clean(command.school) ||
    !clean(command.grade) ||
    !clean(command.guardianName) ||
    !clean(command.guardianPhone)
  )
    return response(false, "VALIDATION_ERROR", "所有個資欄位皆為必填");
  student.phone = clean(command.phone);
  studentProfileStore.updateProfile({
    ...profile,
    phone: student.phone,
    school: clean(command.school),
    grade: clean(command.grade),
    revision: profile.revision + 1,
  });
  studentProfileStore.updateGuardian({
    ...guardian,
    name: clean(command.guardianName),
    phone: clean(command.guardianPhone),
  });
  return response(true, "OK", "學生與家長資料已更新");
}

export function recordAssessmentResult(
  actor: AuthorizationContext,
  command: RecordAssessmentResultCommand,
): CommandResult {
  if (!can(actor, "assessment_history.manage"))
    return response(false, "FORBIDDEN", "你沒有登錄成績的權限");
  if (!accessible(actor, command.studentId))
    return response(false, "NOT_FOUND", "找不到可管理的學生");
  const assessment = studentProfileStore.assessments.find(
    (x) => x.id === command.assessmentId && x.organizationId === actor.organizationId,
  );
  if (!assessment) return response(false, "NOT_FOUND", "找不到測驗");
  if (
    !Number.isFinite(command.score) ||
    command.score < 0 ||
    command.score > assessment.maximumScore
  )
    return response(false, "VALIDATION_ERROR", `分數須介於 0 與 ${assessment.maximumScore} 之間`);
  if (
    studentProfileStore.results.some(
      (x) =>
        x.studentId === command.studentId &&
        x.assessmentId === command.assessmentId &&
        x.organizationId === actor.organizationId,
    )
  )
    return response(false, "CONFLICT", "此測驗已有成績，請使用更正功能");
  studentProfileStore.addResult({
    id: `result-${crypto.randomUUID()}`,
    organizationId: actor.organizationId,
    assessmentId: assessment.id,
    studentId: command.studentId,
    score: command.score,
    comment: clean(command.comment),
    revision: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.profileId,
  });
  return response(true, "OK", "成績已登錄");
}

export function correctAssessmentResult(
  actor: AuthorizationContext,
  command: CorrectAssessmentResultCommand,
): CommandResult {
  if (!can(actor, "assessment_history.manage"))
    return response(false, "FORBIDDEN", "你沒有更正成績的權限");
  const current = studentProfileStore.results.find(
    (x) => x.id === command.resultId && x.organizationId === actor.organizationId,
  );
  if (!current || !accessible(actor, current.studentId))
    return response(false, "NOT_FOUND", "找不到可管理的成績");
  const assessment = studentProfileStore.assessments.find(
    (x) => x.id === current.assessmentId && x.organizationId === actor.organizationId,
  );
  if (!assessment) return response(false, "NOT_FOUND", "找不到測驗");
  if (current.revision !== command.revision)
    return response(false, "CONFLICT", "成績已被更新，請重新整理後再試");
  if (
    !Number.isFinite(command.score) ||
    command.score < 0 ||
    command.score > assessment.maximumScore
  )
    return response(false, "VALIDATION_ERROR", `分數須介於 0 與 ${assessment.maximumScore} 之間`);
  studentProfileStore.updateResult({
    ...current,
    score: command.score,
    comment: clean(command.comment),
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.profileId,
  });
  return response(true, "OK", "成績已更正");
}
