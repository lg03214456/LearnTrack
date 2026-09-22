import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ClassEditorView,
  ClassOverviewRow,
  ExpectedAttendanceClass,
} from "@/features/classes/class-management.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { classManagementStore, classReferenceData } from "@/server/data/mock/class-management";
import { students } from "@/server/data/mock/fixtures";
const labels = (ids: string[], options: { id: string; label: string }[]) =>
  ids.map((id) => options.find((x) => x.id === id)?.label).filter((x): x is string => Boolean(x));
const capabilities = (actor: AuthorizationContext, classId?: string) => {
  const organizationWide = actor.scope.kind === "organization-wide";
  return {
    canCreate: organizationWide && can(actor, "classes.manage"),
    canEdit: can(actor, "classes.manage") && (!classId || canAccessClass(actor, classId)),
    canChangeTeacher: organizationWide && can(actor, "classes.manage"),
    canChangeLifecycle: organizationWide && can(actor, "classes.manage"),
  };
};
export const classManagementRepository = {
  async list(
    actor: AuthorizationContext,
    query: { search?: string; gradeId?: string; includeArchived?: boolean } = {},
  ): Promise<ClassOverviewRow[]> {
    const search = query.search?.trim().toLocaleLowerCase();
    return classManagementStore.classes
      .filter(
        (x) =>
          x.organizationId === actor.organizationId &&
          canAccessClass(actor, x.id) &&
          (query.includeArchived || x.status !== "archived"),
      )
      .filter(
        (x) =>
          !search ||
          x.name.toLocaleLowerCase().includes(search) ||
          x.code.toLocaleLowerCase().includes(search),
      )
      .filter(
        (x) =>
          !query.gradeId ||
          classManagementStore.grades.some(
            (g) => g.classId === x.id && g.gradeId === query.gradeId,
          ),
      )
      .map((x) => {
        const assignment = classManagementStore.teachers.find((t) => t.classId === x.id);
        return {
          id: x.id,
          name: x.name,
          code: x.code,
          type: x.type,
          subjects: labels(
            classManagementStore.subjects.filter((s) => s.classId === x.id).map((s) => s.subjectId),
            classReferenceData.subjects,
          ),
          grades: labels(
            classManagementStore.grades.filter((g) => g.classId === x.id).map((g) => g.gradeId),
            classReferenceData.grades,
          ),
          allGrades: classManagementStore.grades.some(
            (g) => g.classId === x.id && g.gradeId === "all",
          ),
          teacherName:
            classReferenceData.teachers.find((t) => t.id === assignment?.teacherId)?.label ??
            "未指派",
          capacity: x.capacity,
          studentCount: new Set(
            classManagementStore.enrollments
              .filter((e) => e.classId === x.id && e.status === "active")
              .map((e) => e.studentId),
          ).size,
          status: x.status,
          schedules: classManagementStore.schedules
            .filter((s) => s.classId === x.id)
            .map(({ weekday, startTime, endTime, room }) => ({ weekday, startTime, endTime, room }))
            .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)),
          progress: x.progress,
          revision: x.revision,
          capabilities: capabilities(actor, x.id),
        };
      });
  },
  async editor(actor: AuthorizationContext, classId?: string): Promise<ClassEditorView | null> {
    const record = classId
      ? classManagementStore.classes.find(
          (x) =>
            x.id === classId &&
            x.organizationId === actor.organizationId &&
            canAccessClass(actor, x.id),
        )
      : undefined;
    if (classId && !record) return null;
    const selectedStudents = new Set(
      record
        ? classManagementStore.enrollments
            .filter((x) => x.classId === record.id && x.status === "active")
            .map((x) => x.studentId)
        : [],
    );
    return {
      mode: record ? "edit" : "create",
      initial: record
        ? {
            classId: record.id,
            revision: record.revision,
            name: record.name,
            code: record.code,
            type: record.type,
            subjectIds: classManagementStore.subjects
              .filter((x) => x.classId === record.id)
              .map((x) => x.subjectId),
            gradeIds: classManagementStore.grades
              .filter((x) => x.classId === record.id && x.gradeId !== "all")
              .map((x) => x.gradeId),
            allGrades: classManagementStore.grades.some(
              (x) => x.classId === record.id && x.gradeId === "all",
            ),
            teacherId:
              classManagementStore.teachers.find((x) => x.classId === record.id)?.teacherId ?? "",
            capacity: record.capacity,
            status: record.status,
            schedules: classManagementStore.schedules
              .filter((x) => x.classId === record.id)
              .map(({ weekday, startTime, endTime, room }) => ({
                weekday,
                startTime,
                endTime,
                room,
              })),
            studentIds: [...selectedStudents],
          }
        : {
            name: "",
            code: "",
            type: "progress",
            subjectIds: [],
            gradeIds: [],
            allGrades: false,
            teacherId: "",
            capacity: null,
            status: "recruiting",
            schedules: [],
            studentIds: [],
          },
      teacherOptions: classReferenceData.teachers,
      subjectOptions: classReferenceData.subjects,
      gradeOptions: classReferenceData.grades,
      studentOptions: classReferenceData.students.map((x) => ({
        ...x,
        selected: selectedStudents.has(x.id),
      })),
      capabilities: capabilities(actor, record?.id),
    };
  },
  async expectedAttendance(
    actor: AuthorizationContext,
    date: string,
  ): Promise<ExpectedAttendanceClass[]> {
    const parts = date.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return [];
    const weekday = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay(),
      visibleStudentIds =
        actor.scope.kind === "self-student"
          ? [actor.scope.studentId]
          : actor.scope.kind === "linked-students"
            ? actor.scope.studentIds
            : undefined;
    return classManagementStore.classes
      .filter(
        (x) =>
          x.organizationId === actor.organizationId &&
          x.status === "active" &&
          (canAccessClass(actor, x.id) ||
            Boolean(
              visibleStudentIds?.some((studentId) =>
                classManagementStore.enrollments.some(
                  (e) => e.classId === x.id && e.studentId === studentId && e.status === "active",
                ),
              ),
            )),
      )
      .filter((x) =>
        classManagementStore.schedules.some((s) => s.classId === x.id && s.weekday === weekday),
      )
      .map((x) => ({
        classId: x.id,
        className: x.name,
        schedules: classManagementStore.schedules
          .filter((s) => s.classId === x.id && s.weekday === weekday)
          .map(({ weekday, startTime, endTime, room }) => ({ weekday, startTime, endTime, room })),
        students: classManagementStore.enrollments
          .filter(
            (e) =>
              e.classId === x.id &&
              e.status === "active" &&
              (!visibleStudentIds || visibleStudentIds.includes(e.studentId)),
          )
          .map((e) => students.find((s) => s.id === e.studentId))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .map((s) => ({ studentId: s.id, name: s.name, number: s.number })),
      }));
  },
};
