import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  AppendCompletedProgressCommand,
  CorrectDailyProgressCommand,
  DailyProgressCommandResult,
  SaveDailyProgressCommand,
} from "@/features/class-sessions/class-session.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { classManagementStore } from "@/server/data/mock/class-management";
import {
  classSessionStore,
  type StudentSessionProgressRecord,
} from "@/server/data/mock/class-sessions";
import { curriculumStore } from "@/server/data/mock/curriculum";

const result = (
  ok: boolean,
  code: DailyProgressCommandResult["code"],
  message: string,
): DailyProgressCommandResult => ({ ok, code, message });
const allowedStatuses = new Set(["pending", "in_progress", "completed"]);

function sessionFor(actor: AuthorizationContext, sessionId: string) {
  const session = classSessionStore.sessions.find(
    (item) => item.id === sessionId && item.organizationId === actor.organizationId,
  );
  if (!session || !can(actor, "progress.manage") || !canAccessClass(actor, session.classId)) return;
  return session;
}

export function saveDailyProgress(
  actor: AuthorizationContext,
  command: SaveDailyProgressCommand,
): DailyProgressCommandResult {
  const session = sessionFor(actor, command.sessionId);
  if (!session) return result(false, "FORBIDDEN", "無權更新這堂課");
  if (session.status === "completed")
    return result(false, "CONFLICT", "課堂已完成，請使用更正功能");
  return validateAndPersistEntries(actor, session, command);
}

function validateAndPersistEntries(
  actor: AuthorizationContext,
  session: NonNullable<ReturnType<typeof sessionFor>>,
  command: SaveDailyProgressCommand,
  correctionReason?: string,
): DailyProgressCommandResult {
  if (session.revision !== command.sessionRevision)
    return result(false, "CONFLICT", "課堂已被更新，請重新整理");
  if (command.entries.length > 200) return result(false, "VALIDATION_ERROR", "單次更新筆數過多");
  const seen = new Set<string>();
  for (const entry of command.entries) {
    const member = classSessionStore.members.find(
      (item) =>
        item.id === entry.sessionMemberId &&
        item.classSessionId === session.id &&
        item.studentId === entry.studentId &&
        item.organizationId === actor.organizationId,
    );
    const enrollment = member
      ? classManagementStore.enrollments.find(
          (item) => item.id === member.enrollmentId && item.classId === session.classId,
        )
      : undefined;
    const plan = curriculumStore.plans.find(
      (item) =>
        item.id === entry.studyPlanId &&
        item.studentId === entry.studentId &&
        item.organizationId === actor.organizationId &&
        item.status === "active",
    );
    const learningItem = curriculumStore.learningItems.find(
      (item) =>
        item.id === entry.learningItemId &&
        item.planId === plan?.id &&
        item.organizationId === actor.organizationId &&
        item.status !== "skipped",
    );
    const key = `${entry.sessionMemberId}:${entry.learningItemId}`;
    if (
      !member ||
      !enrollment ||
      !plan ||
      !learningItem ||
      !allowedStatuses.has(entry.status) ||
      (entry.note?.trim().length ?? 0) > 300 ||
      seen.has(key)
    )
      return result(false, "VALIDATION_ERROR", "進度資料與學生教材不一致");
    if (learningItem.revision !== entry.learningItemRevision)
      return result(false, "CONFLICT", `${entry.studentId} 的教材進度已更新`);
    seen.add(key);
  }

  const sessionSnapshot = classSessionStore.snapshot();
  const learningSnapshot = structuredClone(curriculumStore.learningItems);
  try {
    const now = new Date().toISOString();
    const records: StudentSessionProgressRecord[] = command.entries.map((entry) => ({
      id: classSessionStore.nextId("session-progress"),
      organizationId: actor.organizationId,
      classSessionId: session.id,
      sessionMemberId: entry.sessionMemberId,
      studentId: entry.studentId,
      studyPlanId: entry.studyPlanId,
      learningItemId: entry.learningItemId,
      statusAfterSession: entry.status,
      note: entry.note?.trim() || undefined,
      recordedBy: actor.profileId,
      recordedAt: now,
      correctionReason,
      revision: 1,
    }));
    const updates = curriculumStore.learningItems.map((item) => {
      const entry = command.entries.find((candidate) => candidate.learningItemId === item.id);
      return entry
        ? {
            ...item,
            status: entry.status,
            note: entry.note?.trim() || undefined,
            updatedAt: now,
            updatedBy: actor.profileId,
            revision: item.revision + 1,
          }
        : item;
    });
    classSessionStore.appendProgress(records);
    classSessionStore.updateSession({ ...session, revision: session.revision + 1 });
    curriculumStore.replaceLearningItems(updates);
    return result(
      true,
      "OK",
      correctionReason
        ? `已補登 ${records.length} 筆學生進度`
        : `已儲存 ${records.length} 筆學生進度`,
    );
  } catch {
    classSessionStore.restore(sessionSnapshot);
    curriculumStore.replaceLearningItems(learningSnapshot);
    return result(false, "CONFLICT", "儲存失敗，資料未變更");
  }
}

export function appendCompletedProgress(
  actor: AuthorizationContext,
  command: AppendCompletedProgressCommand,
): DailyProgressCommandResult {
  const session = sessionFor(actor, command.sessionId);
  if (!session) return result(false, "FORBIDDEN", "無權更新這堂課");
  if (session.status !== "completed")
    return result(false, "CONFLICT", "課堂尚未完成，請使用一般更新功能");
  const reason = command.reason.trim();
  if (!reason || reason.length > 200)
    return result(false, "VALIDATION_ERROR", "請填寫有效的補登原因");
  if (!command.entries.length) return result(false, "VALIDATION_ERROR", "請至少新增一筆學生進度");
  return validateAndPersistEntries(actor, session, command, reason);
}

export function completeClassSession(
  actor: AuthorizationContext,
  sessionId: string,
  revision: number,
): DailyProgressCommandResult {
  const session = sessionFor(actor, sessionId);
  if (!session) return result(false, "FORBIDDEN", "無權完成這堂課");
  if (session.revision !== revision) return result(false, "CONFLICT", "課堂已被更新，請重新整理");
  classSessionStore.updateSession({
    ...session,
    status: "completed",
    completedAt: new Date().toISOString(),
    revision: session.revision + 1,
  });
  return result(true, "OK", "今日課堂已完成");
}

export function correctDailyProgress(
  actor: AuthorizationContext,
  command: CorrectDailyProgressCommand,
): DailyProgressCommandResult {
  const previous = classSessionStore.progress.find(
    (item) => item.id === command.progressId && item.organizationId === actor.organizationId,
  );
  const session = previous ? sessionFor(actor, previous.classSessionId) : undefined;
  const learningItem = previous
    ? curriculumStore.learningItems.find((item) => item.id === previous.learningItemId)
    : undefined;
  if (!previous || !session || !learningItem) return result(false, "FORBIDDEN", "無權更正這筆進度");
  if (previous.revision !== command.revision)
    return result(false, "CONFLICT", "紀錄已被更正，請重新整理");
  if (!command.reason.trim() || command.reason.trim().length > 200)
    return result(false, "VALIDATION_ERROR", "請填寫有效的更正原因");
  if (!allowedStatuses.has(command.status) || (command.note?.trim().length ?? 0) > 300)
    return result(false, "VALIDATION_ERROR", "更正內容無效");
  const now = new Date().toISOString();
  classSessionStore.appendProgress([
    {
      ...previous,
      id: classSessionStore.nextId("session-progress"),
      statusAfterSession: command.status,
      note: command.note?.trim() || undefined,
      recordedBy: actor.profileId,
      recordedAt: now,
      supersedesId: previous.id,
      correctionReason: command.reason.trim(),
      revision: previous.revision + 1,
    },
  ]);
  curriculumStore.updateLearningItem({
    ...learningItem,
    status: command.status,
    note: command.note?.trim() || undefined,
    updatedAt: now,
    updatedBy: actor.profileId,
    revision: learningItem.revision + 1,
  });
  return result(true, "OK", "進度更正已保留紀錄");
}
