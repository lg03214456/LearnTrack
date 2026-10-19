"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  CurriculumItemFormState,
  TemplateItemType,
} from "@/features/curriculum/curriculum.types";
import type {
  CurriculumCommandResult,
  ReorderTemplateItemsCommand,
  CurriculumTemplateEditor,
} from "@/features/curriculum/curriculum.types";
import {
  addTemplateItem,
  adjustLearningItem,
  archiveTemplate,
  copyVersion,
  createAndActivatePlan,
  createTemplate,
  deleteTemplateItem,
  moveTemplateItem,
  publishVersion,
  reorderTemplateItems,
  updateTemplate,
  updateTemplateItem,
} from "@/server/services/curriculum-persistence-service";
import { curriculumRepository } from "@/server/repositories/curriculum";
import { RepositoryError } from "@/server/repositories/repository-error";

export async function readTemplateEditorAction(
  templateId: string,
): Promise<{ editor?: CurriculumTemplateEditor; message?: string }> {
  const actor = await getAuthorizationContext();
  try {
    return { editor: await curriculumRepository.templateEditor(actor, String(templateId)) };
  } catch (error) {
    if (!(error instanceof RepositoryError)) throw error;
    return {
      message:
        error.code === "FORBIDDEN"
          ? "無權管理教材"
          : "教材編輯資料無法載入，請確認 SQL 更新已套用後重試",
    };
  }
}

export async function updateTemplateStateAction(
  _: CurriculumCommandResult,
  data: FormData,
): Promise<CurriculumCommandResult> {
  const actor = await getAuthorizationContext();
  const result = await auditCurriculum(actor, String(data.get("templateId")), () =>
    updateTemplate(actor, {
      templateId: String(data.get("templateId") ?? ""),
      revision: Number(data.get("revision")),
      name: String(data.get("name") ?? ""),
      gradeId: String(data.get("gradeId") ?? ""),
      subjectId: String(data.get("subjectId") ?? ""),
      publisherId: String(data.get("publisherId") ?? ""),
    }),
  );
  if (result.ok) {
    refresh("/curriculum/templates");
    revalidatePath("/curriculum/templates/[versionId]", "page");
    revalidatePath("/students/[studentId]", "page");
  }
  return result;
}

export async function updateTemplateItemStateAction(
  _: CurriculumCommandResult,
  data: FormData,
): Promise<CurriculumCommandResult> {
  const actor = await getAuthorizationContext();
  const versionId = String(data.get("versionId") ?? "");
  const result = await auditCurriculum(actor, versionId, () =>
    updateTemplateItem(actor, {
      versionId,
      itemId: String(data.get("itemId") ?? ""),
      revision: Number(data.get("revision")),
      title: String(data.get("title") ?? ""),
      type: String(data.get("type")) as TemplateItemType,
      parentId: String(data.get("parentId") ?? "") || undefined,
    }),
  );
  if (result.ok) refresh(`/curriculum/templates/${versionId}`);
  return result;
}
const refresh = (...paths: string[]) => paths.forEach((path) => revalidatePath(path));
const auditCurriculum = <T extends { ok: boolean; code?: string }>(
  actor: AuthorizationContext,
  resourceId: string | undefined,
  mutate: () => T | Promise<T>,
) =>
  executeAuditedMutation({
    repository: getAuthProviders().audit,
    event: {
      actor,
      organizationId: actor.organizationId,
      action: "curriculum.changed",
      resourceType: "curriculum",
      resourceId,
    },
    mutate,
  });
export async function createTemplateAction(d: FormData) {
  const a = await getAuthorizationContext();
  const result = await auditCurriculum(a, undefined, () =>
    createTemplate(a, {
      name: String(d.get("name")),
      gradeId: String(d.get("gradeId")),
      subjectId: String(d.get("subjectId")),
      publisherId: String(d.get("publisherId")),
    }),
  );
  refresh("/curriculum/templates");
  redirect(
    result.ok
      ? `/curriculum/templates/${result.message}`
      : `/curriculum/templates?notice=${encodeURIComponent(result.message)}&tone=error`,
  );
}
export async function addTemplateItemAction(d: FormData) {
  const a = await getAuthorizationContext();
  await auditCurriculum(a, String(d.get("versionId")), () =>
    addTemplateItem(a, {
      versionId: String(d.get("versionId")),
      title: String(d.get("title")),
      type: String(d.get("type")) as TemplateItemType,
      parentId: String(d.get("parentId") || "") || undefined,
      revision: Number(d.get("revision")),
    }),
  );
  refresh(`/curriculum/templates/${d.get("versionId")}`);
}
export async function addTemplateItemStateAction(
  _: CurriculumItemFormState,
  d: FormData,
): Promise<CurriculumItemFormState> {
  const a = await getAuthorizationContext(),
    versionId = String(d.get("versionId")),
    values = {
      title: String(d.get("title")),
      type: String(d.get("type")) as TemplateItemType,
      parentId: String(d.get("parentId") || "") || undefined,
    },
    result = await auditCurriculum(a, versionId, () =>
      addTemplateItem(a, { versionId, ...values, revision: Number(d.get("revision")) }),
    );
  if (result.ok) refresh(`/curriculum/templates/${versionId}`);
  return { ...result, values: result.ok ? { title: "", type: "unit" } : values };
}
const finishItemMutation = (versionId: string, result: { ok: boolean; message: string }) => {
  refresh(`/curriculum/templates/${versionId}`);
  redirect(
    `/curriculum/templates/${versionId}?notice=${encodeURIComponent(result.message)}&tone=${result.ok ? "success" : "error"}`,
  );
};
export async function deleteTemplateItemAction(d: FormData) {
  const a = await getAuthorizationContext(),
    versionId = String(d.get("versionId"));
  const outcome = await auditCurriculum(a, versionId, () =>
    deleteTemplateItem(a, {
      versionId,
      itemId: String(d.get("itemId")),
      revision: Number(d.get("revision")),
    }),
  );
  finishItemMutation(versionId, outcome);
}
export async function moveTemplateItemAction(d: FormData) {
  const a = await getAuthorizationContext(),
    versionId = String(d.get("versionId"));
  const outcome = await auditCurriculum(a, versionId, () =>
    moveTemplateItem(a, {
      versionId,
      itemId: String(d.get("itemId")),
      direction: String(d.get("direction")) as "up" | "down",
      revision: Number(d.get("revision")),
    }),
  );
  finishItemMutation(versionId, outcome);
}
export async function reorderTemplateItemsAction(
  command: ReorderTemplateItemsCommand,
): Promise<CurriculumCommandResult> {
  const actor = await getAuthorizationContext(),
    result = await auditCurriculum(actor, String(command.versionId), () =>
      reorderTemplateItems(actor, {
        versionId: String(command.versionId),
        orderedItemIds: Array.isArray(command.orderedItemIds)
          ? command.orderedItemIds.map(String)
          : [],
        revision: Number(command.revision),
      }),
    );
  if (result.ok) refresh(`/curriculum/templates/${command.versionId}`);
  return result;
}
export async function publishVersionAction(d: FormData) {
  const a = await getAuthorizationContext();
  const result = await auditCurriculum(a, String(d.get("versionId")), () =>
    publishVersion(a, String(d.get("versionId")), Number(d.get("revision"))),
  );
  refresh("/curriculum/templates", `/curriculum/templates/${d.get("versionId")}`);
  finishItemMutation(String(d.get("versionId")), result);
}
export async function copyVersionAction(d: FormData) {
  const a = await getAuthorizationContext();
  const result = await auditCurriculum(a, String(d.get("versionId")), () =>
    copyVersion(a, String(d.get("versionId")), Number(d.get("revision"))),
  );
  refresh("/curriculum/templates");
  if (result.ok) redirect(`/curriculum/templates/${result.message}`);
  finishItemMutation(String(d.get("versionId")), result);
}
export async function archiveTemplateAction(d: FormData) {
  const a = await getAuthorizationContext();
  const result = await auditCurriculum(a, String(d.get("templateId")), () =>
    archiveTemplate(a, String(d.get("templateId"))),
  );
  refresh("/curriculum/templates");
  if (result.ok) {
    revalidatePath("/curriculum/templates/[versionId]", "page");
    revalidatePath("/students/[studentId]", "page");
  }
  redirect(
    `/curriculum/templates?notice=${encodeURIComponent(result.ok ? "教材已軟刪除（封存），學生既有進度保留" : result.message)}&tone=${result.ok ? "success" : "error"}`,
  );
}
export async function createPlanAction(d: FormData) {
  const a = await getAuthorizationContext();
  const result = await saveAuditedStudentPlan(a, {
    studentId: String(d.get("studentId")),
    termId: String(d.get("termId")),
    versionId: String(d.get("versionId")),
  });
  refresh(`/students/${d.get("studentId")}`, "/progress");
  redirect(
    `/students/${d.get("studentId")}?tab=plans&notice=${encodeURIComponent(result.message)}&tone=${result.ok ? "success" : "error"}`,
  );
}
export async function saveStudentSetupPlanAction(command: {
  studentId: string;
  termId: string;
  versionId: string;
  contextKey: string;
  confirmedReplacement: boolean;
}): Promise<CurriculumCommandResult> {
  const actor = await getAuthorizationContext().catch(() => null);
  if (!actor || command.contextKey !== `${actor.organizationId}:${actor.membershipId}`)
    return { ok: false, code: "FORBIDDEN", message: "登入身分已變更，請重新開啟設定。" };
  const snapshot = await curriculumRepository.studentPlans(actor, command.studentId);
  if (!snapshot) return { ok: false, code: "FORBIDDEN", message: "無法存取學生教材。" };
  const version = snapshot.availableVersions.find((item) => item.id === command.versionId);
  if (!version || !snapshot.terms.some((item) => item.id === command.termId))
    return { ok: false, code: "VALIDATION_ERROR", message: "請重新選擇可用的已發布教材與學期。" };
  if (
    snapshot.plans.some(
      (plan) =>
        plan.status === "active" &&
        (!plan.termId || plan.termId === command.termId) &&
        (!version.subjectId || !plan.subjectId || plan.subjectId === version.subjectId),
    ) &&
    !command.confirmedReplacement
  )
    return {
      ok: false,
      code: "CONFLICT",
      message: "請確認更換規則：同學期同科目的完成項目保留，其餘項目標記移除。",
    };
  const result = await saveAuditedStudentPlan(actor, {
    studentId: command.studentId,
    termId: command.termId,
    versionId: command.versionId,
  });
  if (result.ok) refresh(`/students/${command.studentId}`, "/progress");
  return result;
}
function saveAuditedStudentPlan(
  actor: AuthorizationContext,
  command: { studentId: string; termId: string; versionId: string },
) {
  return auditCurriculum(actor, command.studentId, () => createAndActivatePlan(actor, command));
}
export async function updateLearningItemAction(d: FormData) {
  const a = await getAuthorizationContext();
  const result = await auditCurriculum(a, String(d.get("itemId")), () =>
    adjustLearningItem(a, {
      itemId: String(d.get("itemId")),
      revision: Number(d.get("revision")),
      status: String(d.get("status")) as "pending" | "in_progress" | "completed" | "skipped",
    }),
  );
  refresh(`/students/${d.get("studentId")}`, "/progress");
  redirect(
    `/students/${d.get("studentId")}?tab=plans&notice=${encodeURIComponent(result.message)}&tone=${result.ok ? "success" : "error"}`,
  );
}
