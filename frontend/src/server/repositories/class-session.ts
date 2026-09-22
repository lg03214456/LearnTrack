import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { ClassDailyWorkspace } from "@/features/class-sessions/class-session.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { classManagementStore, classReferenceData } from "@/server/data/mock/class-management";
import {
  classSessionStore,
  type ClassSessionMemberRecord,
} from "@/server/data/mock/class-sessions";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { attendanceRows, students } from "@/server/data/mock/fixtures";
import { buildClassDailyWorkspace } from "./class-session-core";

const scheduleLabel = (classId: string, date: string) => {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const slots = classManagementStore.schedules.filter(
    (slot) => slot.classId === classId && slot.weekday === weekday,
  );
  return slots.length
    ? slots
        .map((slot) => `${slot.startTime}–${slot.endTime}${slot.room ? `・${slot.room}` : ""}`)
        .join("、")
    : "當日無固定排課";
};

function ensureSession(actor: AuthorizationContext, classId: string, date: string) {
  const existing = classSessionStore.sessions.find(
    (session) =>
      session.organizationId === actor.organizationId &&
      session.classId === classId &&
      session.sessionDate === date,
  );
  if (existing) return existing;
  const courseClass = classManagementStore.classes.find(
    (item) => item.id === classId && item.organizationId === actor.organizationId,
  );
  if (!courseClass || !can(actor, "progress.read") || !canAccessClass(actor, classId)) return;
  const session = {
    id: classSessionStore.nextId("class-session"),
    organizationId: actor.organizationId,
    classId,
    sessionDate: date,
    teacherProfileId: actor.profileId,
    status: "draft" as const,
    createdAt: new Date().toISOString(),
    revision: 1,
  };
  const roster: ClassSessionMemberRecord[] = classManagementStore.enrollments
    .filter(
      (enrollment) =>
        enrollment.organizationId === actor.organizationId &&
        enrollment.classId === classId &&
        enrollment.status === "active" &&
        students.some(
          (student) => student.id === enrollment.studentId && student.status !== "archived",
        ),
    )
    .map((enrollment) => ({
      id: classSessionStore.nextId("session-member"),
      organizationId: actor.organizationId,
      classSessionId: session.id,
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      attendanceStatus:
        attendanceRows.find((row) => row.studentId === enrollment.studentId)?.status ?? "pending",
    }));
  classSessionStore.addSession(session, roster);
  return session;
}

export const classSessionRepository = {
  open(
    actor: AuthorizationContext,
    classId: string,
    date: string,
  ): ClassDailyWorkspace | undefined {
    const courseClass = classManagementStore.classes.find(
      (item) => item.id === classId && item.organizationId === actor.organizationId,
    );
    if (!courseClass || !canAccessClass(actor, classId)) return;
    const session = ensureSession(actor, classId, date);
    if (!session) return;
    const assignment = classManagementStore.teachers.find((item) => item.classId === classId);
    return buildClassDailyWorkspace(actor, {
      courseClass,
      teacherName:
        classReferenceData.teachers.find((item) => item.id === assignment?.teacherId)?.label ??
        "未指派",
      scheduleLabel: scheduleLabel(classId, date),
      session,
      members: classSessionStore.members,
      progress: classSessionStore.progress,
      students,
      enrollments: classManagementStore.enrollments,
      plans: curriculumStore.plans,
      learningItems: curriculumStore.learningItems,
      versions: curriculumStore.versions,
      templates: curriculumStore.templates,
      subjects: curriculumStore.subjects,
      publishers: curriculumStore.publishers,
    });
  },
};
