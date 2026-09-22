import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  CurriculumDetail,
  CurriculumDirectory,
  StudentStudyPlanPage,
  StudyPlanView,
} from "@/features/curriculum/curriculum.types";
import type {
  CurriculumTemplate,
  TemplateVersion,
  TemplateItem,
  StudyPlan,
  StudentLearningItem,
} from "@/server/data/mock/curriculum";
import type { StudentRecord, Enrollment } from "@/server/domain/types";
export interface CurriculumSource {
  grades: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
  terms: { id: string; name: string }[];
  templates: CurriculumTemplate[];
  versions: TemplateVersion[];
  items: TemplateItem[];
  plans: StudyPlan[];
  learningItems: StudentLearningItem[];
  students: StudentRecord[];
  enrollments: Enrollment[];
}
const name = (rows: { id: string; name: string }[], id: string) =>
  rows.find((x) => x.id === id)?.name ?? "未知";
export function buildCurriculumDirectory(
  actor: AuthorizationContext,
  source: CurriculumSource,
  filter: { gradeId?: string; subjectId?: string; publisherId?: string; status?: string } = {},
): CurriculumDirectory {
  const base = source.templates.filter((x) => x.organizationId === actor.organizationId);
  const mapped = base.map((t) => ({
    id: t.id,
    name: t.name,
    grade: name(source.grades, t.gradeId),
    subject: name(source.subjects, t.subjectId),
    publisher: name(source.publishers, t.publisherId),
    isArchived: t.isArchived,
    versions: source.versions
      .filter((v) => v.templateId === t.id)
      .sort((a, b) => b.number - a.number)
      .map((v) => ({
        id: v.id,
        number: v.number,
        status: v.status,
        revision: v.revision,
        itemCount: source.items.filter((i) => i.versionId === v.id).length,
      })),
  }));
  const rows = mapped.filter((x, i) => {
    const raw = base[i];
    return (
      (!filter.gradeId || raw.gradeId === filter.gradeId) &&
      (!filter.subjectId || raw.subjectId === filter.subjectId) &&
      (!filter.publisherId || raw.publisherId === filter.publisherId) &&
      (!filter.status ||
        (filter.status === "archived"
          ? x.isArchived
          : x.versions.some((v) => v.status === filter.status)))
    );
  });
  return {
    rows,
    dimensions: { grades: source.grades, subjects: source.subjects, publishers: source.publishers },
    summary: {
      total: mapped.length,
      published: mapped.filter((x) => x.versions.some((v) => v.status === "published")).length,
      draft: mapped.filter((x) => x.versions.some((v) => v.status === "draft")).length,
      archived: mapped.filter((x) => x.isArchived).length,
    },
  };
}
export function buildCurriculumDetail(
  actor: AuthorizationContext,
  source: CurriculumSource,
  versionId: string,
): CurriculumDetail | undefined {
  const version = source.versions.find(
      (x) => x.id === versionId && x.organizationId === actor.organizationId,
    ),
    template =
      version &&
      source.templates.find(
        (x) => x.id === version.templateId && x.organizationId === actor.organizationId,
      );
  if (!version || !template) return;
  const directory = buildCurriculumDirectory(actor, source).rows.find((x) => x.id === template.id)!;
  return {
    template: directory,
    versionId: version.id,
    versionNumber: version.number,
    status: version.status,
    revision: version.revision,
    items: source.items
      .filter((x) => x.versionId === version.id)
      .sort((a, b) => a.position - b.position),
  };
}
export function canViewStudent(
  actor: AuthorizationContext,
  studentId: string,
  source: CurriculumSource,
) {
  if (!source.students.some((x) => x.id === studentId && x.organizationId === actor.organizationId))
    return false;
  if (actor.scope.kind === "organization-wide") return true;
  if (actor.scope.kind === "self-student") return actor.scope.studentId === studentId;
  if (actor.scope.kind === "linked-students") return actor.scope.studentIds.includes(studentId);
  const classIds = actor.scope.classIds;
  return source.enrollments.some(
    (x) =>
      x.studentId === studentId &&
      x.organizationId === actor.organizationId &&
      classIds.includes(x.classId) &&
      x.status === "active",
  );
}
export function buildStudentStudyPlanPage(
  actor: AuthorizationContext,
  studentId: string,
  source: CurriculumSource,
): StudentStudyPlanPage | undefined {
  if (!canViewStudent(actor, studentId, source)) return;
  const student = source.students.find(
    (x) => x.id === studentId && x.organizationId === actor.organizationId,
  );
  if (!student) return;
  const plans: StudyPlanView[] = source.plans
    .filter((x) => x.studentId === studentId && x.organizationId === actor.organizationId)
    .map((plan) => {
      const version = source.versions.find((x) => x.id === plan.versionId)!,
        template = source.templates.find((x) => x.id === version.templateId)!,
        items = source.learningItems
          .filter((x) => x.planId === plan.id)
          .sort((a, b) => a.position - b.position),
        included = items.filter((x) => x.status !== "skipped"),
        completed = included.filter((x) => x.status === "completed").length;
      return {
        id: plan.id,
        term: name(source.terms, plan.termId),
        subject: name(source.subjects, plan.subjectId),
        grade: name(source.grades, plan.gradeId),
        publisher: name(source.publishers, template.publisherId),
        templateName: template.name,
        version: version.number,
        status: plan.status,
        completed,
        total: included.length,
        percentage: included.length ? Math.round((completed / included.length) * 100) : 0,
        items,
      };
    });
  return {
    student: { id: student.id, name: student.name, number: student.number },
    plans,
    availableVersions: source.versions
      .filter(
        (x) =>
          x.status === "published" &&
          source.templates.some((t) => t.id === x.templateId && !t.isArchived),
      )
      .map((x) => ({
        id: x.id,
        label: `${source.templates.find((t) => t.id === x.templateId)!.name} v${x.number}`,
      })),
    terms: source.terms,
  };
}
