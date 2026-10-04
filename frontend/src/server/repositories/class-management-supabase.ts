import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { classGradeOptions } from "@/features/classes/class-reference-options";
import type {
  ClassAggregateInput,
  ClassEditorView,
  ClassLifecycle,
  ClassOverviewRow,
  ClassType,
  ExpectedAttendanceClass,
  WeeklyScheduleSlot,
} from "@/features/classes/class-management.types";
import { can, canAccessClass } from "@/server/authorization/policy";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { mapRepositoryError } from "./repository-error";

type ClientFactory = () => Promise<SupabaseClient>;

interface CourseClassRow {
  id: string;
  name: string;
  code: string | null;
  class_type: ClassType;
  capacity: number | null;
  status: ClassLifecycle;
  progress: number;
  revision: number;
}
interface ClassRelationRow {
  class_id: string;
  subject_code?: string;
  grade_code?: string;
}
interface ScheduleRow {
  class_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  room: string;
}
interface AssignmentRow {
  class_id: string;
  membership_id: string;
}
interface EnrollmentRow {
  class_id: string;
  student_id: string;
}
interface StudentRow {
  id: string;
  display_name: string;
  student_number: string;
}
interface MembershipRow {
  id: string;
  profile_id: string;
}
interface ProfileRow {
  id: string;
  display_name: string;
}
interface SubjectRow {
  code: string;
  name: string;
  class_code_prefix: string;
  position: number;
}

const labels = (ids: string[], options: readonly { id: string; label: string }[]) =>
  ids.map((id) => options.find((option) => option.id === id)?.label ?? id);

const capabilities = (actor: AuthorizationContext, classId?: string) => {
  const organizationWide = actor.scope.kind === "organization-wide";
  return {
    canCreate: organizationWide && can(actor, "classes.manage"),
    canEdit: can(actor, "classes.manage") && (!classId || canAccessClass(actor, classId)),
    canChangeTeacher: organizationWide && can(actor, "classes.manage"),
    canChangeLifecycle: organizationWide && can(actor, "classes.manage"),
  };
};

export class SupabaseClassManagementRepository {
  constructor(private readonly clientFactory: ClientFactory = createCurrentUserSupabaseClient) {}

  private async load(actor: AuthorizationContext) {
    const client = await this.clientFactory();
    const organizationId = actor.organizationId;
    const [
      classes,
      classSubjects,
      grades,
      schedules,
      assignments,
      enrollments,
      students,
      memberships,
      subjectCatalog,
    ] = await Promise.all([
      client
        .from("course_classes")
        .select("id, name, code, class_type, capacity, status, progress, revision")
        .eq("organization_id", organizationId),
      client
        .from("class_subjects")
        .select("class_id, subject_code")
        .eq("organization_id", organizationId),
      client
        .from("class_grade_scopes")
        .select("class_id, grade_code")
        .eq("organization_id", organizationId),
      client
        .from("class_schedules")
        .select("class_id, weekday, starts_at, ends_at, room")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      client
        .from("class_assignments")
        .select("class_id, membership_id")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      client
        .from("class_enrollments")
        .select("class_id, student_id")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      client
        .from("students")
        .select("id, display_name, student_number")
        .eq("organization_id", organizationId)
        .neq("status", "archived"),
      client
        .from("organization_memberships")
        .select("id, profile_id")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      client
        .from("subjects")
        .select("code, name, class_code_prefix, position")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
    ]);
    const initialError = [
      classes,
      classSubjects,
      grades,
      schedules,
      assignments,
      enrollments,
      students,
      memberships,
      subjectCatalog,
    ].find((result) => result.error)?.error;
    if (initialError) throw mapRepositoryError(initialError);
    const membershipRows = (memberships.data ?? []) as MembershipRow[];
    const profileIds = [...new Set(membershipRows.map((row) => row.profile_id))];
    const profiles = profileIds.length
      ? await client.from("profiles").select("id, display_name").in("id", profileIds)
      : { data: [] as ProfileRow[], error: null };
    if (profiles.error) throw mapRepositoryError(profiles.error);
    return {
      client,
      classes: (classes.data ?? []) as CourseClassRow[],
      classSubjects: (classSubjects.data ?? []) as ClassRelationRow[],
      grades: (grades.data ?? []) as ClassRelationRow[],
      schedules: (schedules.data ?? []) as ScheduleRow[],
      assignments: (assignments.data ?? []) as AssignmentRow[],
      enrollments: (enrollments.data ?? []) as EnrollmentRow[],
      students: (students.data ?? []) as StudentRow[],
      memberships: membershipRows,
      profiles: (profiles.data ?? []) as ProfileRow[],
      subjectCatalog: ((subjectCatalog.data ?? []) as SubjectRow[]).sort(
        (a, b) => a.position - b.position || a.name.localeCompare(b.name),
      ),
    };
  }

  async list(
    actor: AuthorizationContext,
    query: { search?: string; gradeId?: string; includeArchived?: boolean } = {},
  ): Promise<ClassOverviewRow[]> {
    const source = await this.load(actor);
    const search = query.search?.trim().toLocaleLowerCase();
    return source.classes
      .filter((row) => query.includeArchived || row.status !== "archived")
      .filter(
        (row) =>
          !search ||
          row.name.toLocaleLowerCase().includes(search) ||
          (row.code ?? "").toLocaleLowerCase().includes(search),
      )
      .filter(
        (row) =>
          !query.gradeId ||
          source.grades.some(
            (grade) => grade.class_id === row.id && grade.grade_code === query.gradeId,
          ),
      )
      .map((row) => {
        const assignment = source.assignments.find((item) => item.class_id === row.id);
        const membership = source.memberships.find((item) => item.id === assignment?.membership_id);
        const profile = source.profiles.find((item) => item.id === membership?.profile_id);
        const subjectIds = source.classSubjects
          .filter((item) => item.class_id === row.id)
          .map((item) => item.subject_code!);
        const gradeIds = source.grades
          .filter((item) => item.class_id === row.id)
          .map((item) => item.grade_code!);
        return {
          id: row.id,
          name: row.name,
          code: row.code ?? "",
          type: row.class_type,
          subjects: labels(
            subjectIds,
            source.subjectCatalog.map((subject) => ({ id: subject.code, label: subject.name })),
          ),
          grades: labels(
            gradeIds.filter((id) => id !== "all"),
            classGradeOptions,
          ),
          allGrades: gradeIds.includes("all"),
          teacherName: profile?.display_name ?? "未指派",
          capacity: row.capacity,
          studentCount: source.enrollments.filter((item) => item.class_id === row.id).length,
          status: row.status,
          schedules: this.schedulesFor(source.schedules, row.id),
          progress: row.progress,
          revision: row.revision,
          capabilities: capabilities(actor, row.id),
        };
      });
  }

  async editor(actor: AuthorizationContext, classId?: string): Promise<ClassEditorView | null> {
    const source = await this.load(actor);
    const record = classId ? source.classes.find((row) => row.id === classId) : undefined;
    if (classId && !record) return null;
    const selectedStudentIds = new Set(
      source.enrollments
        .filter((item) => item.class_id === record?.id)
        .map((item) => item.student_id),
    );
    const assignment = source.assignments.find((item) => item.class_id === record?.id);
    const gradeIds = source.grades
      .filter((item) => item.class_id === record?.id)
      .map((item) => item.grade_code!);
    const initial: ClassAggregateInput = record
      ? {
          classId: record.id,
          revision: record.revision,
          name: record.name,
          code: record.code ?? "",
          type: record.class_type,
          subjectIds: source.classSubjects
            .filter((item) => item.class_id === record.id)
            .map((item) => item.subject_code!),
          gradeIds: gradeIds.filter((id) => id !== "all"),
          allGrades: gradeIds.includes("all"),
          teacherId: assignment?.membership_id ?? "",
          capacity: record.capacity,
          status: record.status,
          schedules: this.schedulesFor(source.schedules, record.id),
          studentIds: [...selectedStudentIds],
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
        };
    return {
      mode: record ? "edit" : "create",
      initial,
      teacherOptions: source.memberships.map((membership) => ({
        id: membership.id,
        label:
          source.profiles.find((profile) => profile.id === membership.profile_id)?.display_name ??
          membership.id,
      })),
      subjectOptions: source.subjectCatalog.map((subject) => ({
        id: subject.code,
        label: subject.name,
      })),
      gradeOptions: [...classGradeOptions],
      studentOptions: source.students.map((student) => ({
        id: student.id,
        label: student.display_name,
        number: student.student_number,
        selected: selectedStudentIds.has(student.id),
      })),
      capabilities: capabilities(actor, record?.id),
    };
  }

  async expectedAttendance(
    actor: AuthorizationContext,
    date: string,
  ): Promise<ExpectedAttendanceClass[]> {
    const parts = date.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return [];
    const weekday = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
    const source = await this.load(actor);
    return source.classes
      .filter((row) => row.status === "active")
      .filter((row) =>
        source.schedules.some((slot) => slot.class_id === row.id && slot.weekday === weekday),
      )
      .map((row) => ({
        classId: row.id,
        className: row.name,
        schedules: this.schedulesFor(
          source.schedules.filter((slot) => slot.weekday === weekday),
          row.id,
        ),
        students: source.enrollments
          .filter((item) => item.class_id === row.id)
          .map((item) => source.students.find((student) => student.id === item.student_id))
          .filter((student): student is StudentRow => Boolean(student))
          .map((student) => ({
            studentId: student.id,
            name: student.display_name,
            number: student.student_number,
          })),
      }));
  }

  async save(actor: AuthorizationContext, input: ClassAggregateInput) {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("save_class_aggregate", {
      target_organization_id: actor.organizationId,
      target_class_id: input.classId ?? null,
      expected_revision: input.revision ?? null,
      class_name: input.name,
      class_code: input.code,
      requested_class_type: input.type,
      class_capacity: input.capacity,
      requested_class_status: input.status,
      subject_codes: input.subjectIds,
      grade_codes: input.allGrades ? ["all"] : input.gradeIds,
      teacher_membership_id: input.teacherId || null,
      schedule_rows: input.schedules,
      student_ids: input.studentIds,
    });
    if (error) throw mapRepositoryError(error);
    return (data as { class_id: string; revision: number }[] | null)?.[0] ?? null;
  }

  private schedulesFor(rows: ScheduleRow[], classId: string): WeeklyScheduleSlot[] {
    return rows
      .filter((row) => row.class_id === classId)
      .map((row) => ({
        weekday: row.weekday,
        startTime: row.starts_at.slice(0, 5),
        endTime: row.ends_at.slice(0, 5),
        room: row.room,
      }))
      .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  }
}

export const supabaseClassManagementRepository = new SupabaseClassManagementRepository();
