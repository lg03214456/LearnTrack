import { PageHeader } from "@/components/page-header";
import { StudentsView } from "@/features/students/components/students-view";
import type { StudentRosterStatus } from "@/features/students/student-roster.types";
import { studentRosterRepository } from "@/server/repositories/student-roster";
import { AccessDenied } from "@/features/access-control/components/access-denied";
import { getAuthorizationContext } from "@/server/auth/identity";
import { can } from "@/server/authorization/policy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || !can(actor, "students.read")) return <AccessDenied />;
  const params = await searchParams;
  const statusValue = first(params.status);
  const status: StudentRosterStatus | undefined =
    statusValue === "active" || statusValue === "leave" || statusValue === "archived"
      ? statusValue
      : undefined;
  const query = {
    organizationId: actor.organizationId,
    accessibleClassIds: actor.scope.kind === "assigned-classes" ? actor.scope.classIds : undefined,
    accessibleStudentIds:
      actor.scope.kind === "self-student"
        ? [actor.scope.studentId]
        : actor.scope.kind === "linked-students"
          ? actor.scope.studentIds
          : undefined,
    classId: first(params.classId),
    search: first(params.search),
    status,
    page: positiveInteger(first(params.page), 1),
    pageSize: 20,
  };
  const result = await studentRosterRepository.listStudents(query);
  return (
    <>
      <PageHeader
        eyebrow="教學管理 / 學生名單"
        title="學生名單總覽"
        description="管理學生基本資料、班級與在籍狀態。"
      />
      <StudentsView
        result={result}
        query={query}
        canManageStudents={
          can(actor, "students.manage") && actor.scope.kind === "organization-wide"
        }
        canManageClasses={can(actor, "classes.manage") && actor.scope.kind === "organization-wide"}
      />
    </>
  );
}
