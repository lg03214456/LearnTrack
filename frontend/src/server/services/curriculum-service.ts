import "server-only";
import type {
  AuthorizationContext,
  CommandResult,
} from "@/features/access-control/access-control.types";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { can } from "@/server/authorization/policy";
import { students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { canViewStudent } from "@/server/repositories/curriculum-core";
const out = (ok: boolean, code: CommandResult["code"], message: string): CommandResult => ({
    ok,
    code,
    message,
  }),
  id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const source = () => ({ ...curriculumStore, students, enrollments });
export function createTemplate(
  actor: AuthorizationContext,
  input: { name: string; gradeId: string; subjectId: string; publisherId: string },
) {
  if (!can(actor, "curriculum.manage")) return out(false, "FORBIDDEN", "無權管理教材");
  if (
    !input.name.trim() ||
    ![curriculumStore.grades, curriculumStore.subjects, curriculumStore.publishers].every((r, i) =>
      r.some((x) => x.id === [input.gradeId, input.subjectId, input.publisherId][i]),
    )
  )
    return out(false, "VALIDATION_ERROR", "請選擇完整範本分類");
  if (
    curriculumStore.templates.some(
      (x) =>
        x.organizationId === actor.organizationId && !x.isArchived && x.name === input.name.trim(),
    )
  )
    return out(false, "CONFLICT", "範本名稱已存在");
  const key = id(),
    version = `ver-${key}`;
  curriculumStore.addTemplate({
    id: `tpl-${key}`,
    organizationId: actor.organizationId,
    name: input.name.trim(),
    gradeId: input.gradeId,
    subjectId: input.subjectId,
    publisherId: input.publisherId,
    isArchived: false,
  });
  curriculumStore.addVersion({
    id: version,
    organizationId: actor.organizationId,
    templateId: `tpl-${key}`,
    number: 1,
    status: "draft",
    revision: 1,
  });
  return out(true, "OK", version);
}
export function publishVersion(actor: AuthorizationContext, versionId: string) {
  if (!can(actor, "curriculum.manage")) return out(false, "FORBIDDEN", "無權管理教材");
  const v = curriculumStore.versions.find(
    (x) => x.id === versionId && x.organizationId === actor.organizationId,
  );
  if (!v) return out(false, "NOT_FOUND", "找不到版本");
  if (!curriculumStore.items.some((x) => x.versionId === v.id))
    return out(false, "VALIDATION_ERROR", "版本至少需要一個項目");
  curriculumStore.updateVersion({ ...v, status: "published", revision: v.revision + 1 });
  return out(true, "OK", "版本已發布");
}
export function copyVersion(actor: AuthorizationContext, versionId: string) {
  if (!can(actor, "curriculum.manage")) return out(false, "FORBIDDEN", "無權管理教材");
  const v = curriculumStore.versions.find(
    (x) => x.id === versionId && x.organizationId === actor.organizationId,
  );
  if (!v) return out(false, "NOT_FOUND", "找不到版本");
  const number =
      Math.max(
        ...curriculumStore.versions
          .filter((x) => x.templateId === v.templateId)
          .map((x) => x.number),
      ) + 1,
    newId = `ver-${id()}`;
  curriculumStore.addVersion({ ...v, id: newId, number, status: "draft", revision: 1 });
  const map = new Map<string, string>(),
    old = curriculumStore.items.filter((x) => x.versionId === v.id);
  for (const x of old) map.set(x.id, `item-${id()}`);
  curriculumStore.addItems(
    old.map((x) => ({
      ...x,
      id: map.get(x.id)!,
      versionId: newId,
      parentId: x.parentId ? map.get(x.parentId) : undefined,
    })),
  );
  return out(true, "OK", newId);
}
export function archiveTemplate(actor: AuthorizationContext, templateId: string) {
  if (!can(actor, "curriculum.manage")) return out(false, "FORBIDDEN", "無權管理教材");
  const t = curriculumStore.templates.find(
    (x) => x.id === templateId && x.organizationId === actor.organizationId,
  );
  if (!t) return out(false, "NOT_FOUND", "找不到範本");
  curriculumStore.updateTemplate({ ...t, isArchived: true });
  return out(true, "OK", "範本已封存");
}
export function createAndActivatePlan(
  actor: AuthorizationContext,
  input: { studentId: string; termId: string; versionId: string },
) {
  if (!can(actor, "study_plans.manage")) return out(false, "FORBIDDEN", "無權管理修課計畫");
  if (!canViewStudent(actor, input.studentId, source()))
    return out(false, "NOT_FOUND", "找不到學生");
  const v = curriculumStore.versions.find(
      (x) => x.id === input.versionId && x.status === "published",
    ),
    t = v && curriculumStore.templates.find((x) => x.id === v.templateId && !x.isArchived);
  if (!v || !t || !curriculumStore.terms.some((x) => x.id === input.termId))
    return out(false, "VALIDATION_ERROR", "請選擇可用學期與已發布版本");
  if (
    curriculumStore.plans.some(
      (x) =>
        x.studentId === input.studentId &&
        x.termId === input.termId &&
        x.subjectId === t.subjectId &&
        x.status === "active",
    )
  )
    return out(false, "CONFLICT", "同學期科目已有修課計畫");
  const planId = `plan-${id()}`;
  curriculumStore.addPlan({
    id: planId,
    organizationId: actor.organizationId,
    studentId: input.studentId,
    termId: input.termId,
    gradeId: t.gradeId,
    subjectId: t.subjectId,
    versionId: v.id,
    status: "active",
  });
  curriculumStore.addLearningItems(
    curriculumStore.items
      .filter((x) => x.versionId === v.id)
      .map((x) => ({
        id: `learn-${id()}`,
        organizationId: actor.organizationId,
        planId,
        sourceItemId: x.id,
        type: x.type,
        title: x.title,
        position: x.position,
        status: "pending",
        isCustom: false,
        revision: 1,
      })),
  );
  return out(true, "OK", "修課計畫已啟用");
}
export function adjustLearningItem(
  actor: AuthorizationContext,
  input: {
    itemId: string;
    title?: string;
    status?: "pending" | "in_progress" | "completed" | "skipped";
  },
) {
  if (!can(actor, "study_plans.manage")) return out(false, "FORBIDDEN", "無權管理修課計畫");
  const item = curriculumStore.learningItems.find((x) => x.id === input.itemId),
    plan = item && curriculumStore.plans.find((x) => x.id === item.planId);
  if (!item || !plan || !canViewStudent(actor, plan.studentId, source()))
    return out(false, "NOT_FOUND", "找不到學習項目");
  curriculumStore.updateLearningItem({
    ...item,
    title: input.title?.trim() || item.title,
    status: input.status ?? item.status,
  });
  return out(true, "OK", "個人進度已更新");
}

export {
  addTemplateItem,
  deleteTemplateItem,
  moveTemplateItem,
  reorderTemplateItems,
  updateTemplateItem,
} from "./curriculum-item-service";
