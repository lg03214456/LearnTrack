import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { SaveClassAttendanceCommand } from "@/features/class-sessions/class-session.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { classSessionStore, type ClassAttendanceRecord } from "@/server/data/mock/class-sessions";
import { RepositoryError } from "./repository-error";

export const mockClassAttendanceRepository = {
  async save(actor: AuthorizationContext, command: SaveClassAttendanceCommand) {
    const lesson = classSessionStore.sessions.find(
      (session) =>
        session.id === command.sessionId && session.organizationId === actor.organizationId,
    );
    if (
      !lesson ||
      !can(actor, "attendance.manage") ||
      !can(actor, "attendance.read") ||
      !canAccessClass(actor, lesson.classId)
    )
      throw new RepositoryError("FORBIDDEN");
    if (lesson.revision !== command.sessionRevision) throw new RepositoryError("CONFLICT");
    const staged: Omit<ClassAttendanceRecord, "id">[] = [];
    for (const entry of command.entries) {
      const member = classSessionStore.members.find(
        (candidate) =>
          candidate.id === entry.sessionMemberId &&
          candidate.organizationId === actor.organizationId &&
          candidate.classSessionId === lesson.id &&
          candidate.studentId === entry.studentId,
      );
      if (!member) throw new RepositoryError("INVALID_RELATIONSHIP");
      const previous = classSessionStore.attendance.find(
        (record) =>
          record.sessionMemberId === member.id &&
          record.organizationId === actor.organizationId &&
          !classSessionStore.attendance.some((successor) => successor.supersedesId === record.id),
      );
      if ((previous?.id ?? "") !== (entry.previousRecordId ?? ""))
        throw new RepositoryError("CONFLICT");
      if ((previous || lesson.status === "completed") && !command.reason.trim())
        throw new RepositoryError("INVALID_RELATIONSHIP");
      staged.push({
        organizationId: actor.organizationId,
        classSessionId: lesson.id,
        sessionMemberId: member.id,
        studentId: member.studentId,
        status: entry.status,
        arrivedAt:
          entry.status === "late" && entry.arrivalTime
            ? new Date(`${lesson.sessionDate}T${entry.arrivalTime}:00+08:00`).toISOString()
            : undefined,
        recordedAt: new Date().toISOString(),
        recordedBy: actor.profileId,
        supersedesId: previous?.id,
        correctionReason: command.reason.trim() || undefined,
        revision: (previous?.revision ?? 0) + 1,
      });
    }
    // No store mutation until every submitted member has passed validation.
    classSessionStore.appendAttendance(
      staged.map((record) => ({ ...record, id: classSessionStore.nextId("attendance") })),
    );
    classSessionStore.updateSession({ ...lesson, revision: lesson.revision + 1 });
  },
};
