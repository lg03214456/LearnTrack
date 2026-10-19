import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ClassDailyWorkspace,
  ClassSessionMemberView,
  ClassSessionProgressView,
} from "@/features/class-sessions/class-session.types";
import type { ClassEntity, ClassEnrollment } from "@/server/data/mock/class-management";
import type {
  ClassSessionMemberRecord,
  ClassAttendanceRecord,
  ClassSessionRecord,
  StudentSessionProgressRecord,
} from "@/server/data/mock/class-sessions";
import type {
  CurriculumTemplate,
  StudentLearningItem,
  StudyPlan,
  TemplateVersion,
} from "@/server/data/mock/curriculum";
import type { StudentRecord } from "@/server/domain/types";
import { can, canAccessClass } from "@/server/authorization/policy";

export interface ClassSessionSource {
  courseClass: ClassEntity;
  teacherName: string;
  scheduleLabel: string;
  session: ClassSessionRecord;
  members: ClassSessionMemberRecord[];
  progress: StudentSessionProgressRecord[];
  attendance?: ClassAttendanceRecord[];
  students: StudentRecord[];
  enrollments: ClassEnrollment[];
  plans: StudyPlan[];
  learningItems: StudentLearningItem[];
  versions: TemplateVersion[];
  templates: CurriculumTemplate[];
  subjects: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
}

const findName = (items: { id: string; name: string }[], id: string) =>
  items.find((item) => item.id === id)?.name ?? "未設定";

export function buildClassDailyWorkspace(
  actor: AuthorizationContext,
  source: ClassSessionSource,
): ClassDailyWorkspace | undefined {
  if (
    source.courseClass.organizationId !== actor.organizationId ||
    source.session.organizationId !== actor.organizationId ||
    !can(actor, "progress.read") ||
    !canAccessClass(actor, source.courseClass.id)
  )
    return;

  const history: ClassSessionProgressView[] = source.progress
    .filter(
      (entry) =>
        entry.organizationId === actor.organizationId && entry.classSessionId === source.session.id,
    )
    .map((entry) => {
      const student = source.students.find((item) => item.id === entry.studentId);
      const plan = source.plans.find((item) => item.id === entry.studyPlanId);
      const version = source.versions.find((item) => item.id === plan?.versionId);
      const template = source.templates.find((item) => item.id === version?.templateId);
      const learningItem = source.learningItems.find((item) => item.id === entry.learningItemId);
      return {
        id: entry.id,
        studentId: entry.studentId,
        studentName: student?.name ?? "未知學生",
        planLabel: template?.name ?? "未知教材",
        studyPlanId: entry.studyPlanId,
        versionId: plan?.versionId,
        versionLabel: version ? `版本 ${version.number}` : undefined,
        learningItemId: entry.learningItemId,
        itemPosition: learningItem?.position,
        learningItemTitle: learningItem?.title ?? "未知項目",
        statusAfterSession: entry.statusAfterSession,
        note: entry.note,
        recordedAt: entry.recordedAt,
        recordedBy: entry.recordedBy,
        supersedesId: entry.supersedesId,
        correctionReason: entry.correctionReason,
        revision: entry.revision,
      };
    });

  const members: ClassSessionMemberView[] = source.members
    .filter(
      (member) =>
        member.organizationId === actor.organizationId &&
        member.classSessionId === source.session.id,
    )
    .map((member) => {
      const attendance = can(actor, "attendance.read")
        ? source.attendance?.find(
            (record) =>
              record.organizationId === actor.organizationId &&
              record.sessionMemberId === member.id &&
              !source.attendance?.some((successor) => successor.supersedesId === record.id),
          )
        : undefined;
      const student = source.students.find((item) => item.id === member.studentId)!;
      const plans = source.plans
        .filter(
          (plan) =>
            plan.organizationId === actor.organizationId &&
            plan.studentId === member.studentId &&
            plan.status === "active",
        )
        .map((plan) => {
          const version = source.versions.find((item) => item.id === plan.versionId);
          const template = source.templates.find((item) => item.id === version?.templateId);
          return {
            id: plan.id,
            label: `${findName(source.subjects, plan.subjectId)}・${template?.name ?? "未命名教材"}`,
            versionLabel: `${findName(source.publishers, template?.publisherId ?? "")}・版本 ${version?.number ?? "-"}`,
            items: source.learningItems
              .filter(
                (item) => item.planId === plan.id && !["skipped", "removed"].includes(item.status),
              )
              .sort((a, b) => a.position - b.position)
              .map(({ id, title, status, revision }) => ({
                id,
                title,
                status: status as Exclude<typeof status, "skipped" | "removed">,
                revision,
              })),
          };
        });
      return {
        id: member.id,
        studentId: member.studentId,
        studentName: student?.name ?? "未知學生",
        studentNumber: student?.number ?? "—",
        attendanceStatus: can(actor, "attendance.read")
          ? (attendance?.status ?? member.attendanceStatus)
          : "pending",
        attendance: attendance
          ? {
              id: attendance.id,
              arrivedAt: attendance.arrivedAt,
              recordedAt: attendance.recordedAt,
              revision: attendance.revision,
            }
          : undefined,
        plans,
        needsPlanSetup: plans.length === 0,
        history: history.filter((entry) => entry.studentId === member.studentId),
      };
    });

  return {
    session: {
      id: source.session.id,
      classId: source.courseClass.id,
      className: source.courseClass.name,
      classCode: source.courseClass.code,
      sessionDate: source.session.sessionDate,
      scheduleLabel: source.scheduleLabel,
      teacherName: source.teacherName,
      status: source.session.status,
      revision: source.session.revision,
    },
    members,
    history,
    canManage: can(actor, "progress.manage") && canAccessClass(actor, source.courseClass.id),
    attendanceAvailable: true,
    canManageAttendance:
      can(actor, "attendance.read") &&
      can(actor, "attendance.manage") &&
      canAccessClass(actor, source.courseClass.id),
  };
}
