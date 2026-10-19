import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  CurriculumTemplateEditor,
  UpdateTemplateCommand,
} from "@/features/curriculum/curriculum.types";
import { can } from "@/server/authorization/policy";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { RepositoryError } from "./repository-error";

export function readMockTemplateEditor(
  actor: AuthorizationContext,
  templateId: string,
): CurriculumTemplateEditor {
  if (!can(actor, "curriculum.manage")) throw new RepositoryError("FORBIDDEN");
  const template = curriculumStore.templates.find(
    (row) =>
      row.id === templateId && row.organizationId === actor.organizationId && !row.isArchived,
  );
  if (!template) throw new RepositoryError("NOT_FOUND");
  const versions = curriculumStore.versions.filter(
    (row) => row.templateId === template.id && row.organizationId === actor.organizationId,
  );
  return {
    templateId,
    name: template.name,
    gradeId: template.gradeId,
    subjectId: template.subjectId,
    publisherId: template.publisherId,
    revision: template.revision ?? 1,
    canEditClassification: !versions.some(
      (row) =>
        row.status === "published" ||
        curriculumStore.plans.some((plan) => plan.versionId === row.id),
    ),
    dimensions: {
      grades: curriculumStore.grades,
      subjects: curriculumStore.subjects,
      publishers: curriculumStore.publishers,
    },
  };
}

export function updateMockTemplate(actor: AuthorizationContext, command: UpdateTemplateCommand) {
  const editor = readMockTemplateEditor(actor, command.templateId);
  if (
    editor.revision !== command.revision ||
    (!editor.canEditClassification &&
      (editor.gradeId !== command.gradeId || editor.subjectId !== command.subjectId))
  )
    throw new RepositoryError("CONFLICT");
  if (
    !command.name.trim() ||
    command.name.trim().length > 200 ||
    ![editor.dimensions.grades, editor.dimensions.subjects, editor.dimensions.publishers].every(
      (rows, index) =>
        rows.some(
          (row) => row.id === [command.gradeId, command.subjectId, command.publisherId][index],
        ),
    )
  )
    throw new RepositoryError("INVALID_RELATIONSHIP");
  if (
    curriculumStore.templates.some(
      (row) =>
        row.organizationId === actor.organizationId &&
        row.id !== command.templateId &&
        !row.isArchived &&
        row.name === command.name.trim(),
    )
  )
    throw new RepositoryError("CONFLICT");
  const template = curriculumStore.templates.find(
    (row) => row.id === command.templateId && row.organizationId === actor.organizationId,
  )!;
  curriculumStore.updateTemplate({
    ...template,
    name: command.name.trim(),
    gradeId: command.gradeId,
    subjectId: command.subjectId,
    publisherId: command.publisherId,
    revision: editor.revision + 1,
  });
}
