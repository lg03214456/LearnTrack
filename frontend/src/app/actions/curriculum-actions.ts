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
} from "@/server/services/curriculum-service";
const refresh = (...paths: string[]) => paths.forEach((path) => revalidatePath(path));
const auditCurriculum = <T extends { ok: boolean; code?: string }>(
  actor: AuthorizationContext,
  resourceId: string | undefined,
  mutate: () => T,
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
  await auditCurriculum(a, undefined, () =>
    createTemplate(a, {
      name: String(d.get("name")),
      gradeId: String(d.get("gradeId")),
      subjectId: String(d.get("subjectId")),
      publisherId: String(d.get("publisherId")),
    }),
  );
  refresh("/curriculum/templates");
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
  await auditCurriculum(a, String(d.get("versionId")), () =>
    publishVersion(a, String(d.get("versionId"))),
  );
  refresh("/curriculum/templates", `/curriculum/templates/${d.get("versionId")}`);
}
export async function copyVersionAction(d: FormData) {
  const a = await getAuthorizationContext();
  await auditCurriculum(a, String(d.get("versionId")), () =>
    copyVersion(a, String(d.get("versionId"))),
  );
  refresh("/curriculum/templates");
}
export async function archiveTemplateAction(d: FormData) {
  const a = await getAuthorizationContext();
  await auditCurriculum(a, String(d.get("templateId")), () =>
    archiveTemplate(a, String(d.get("templateId"))),
  );
  refresh("/curriculum/templates");
}
export async function createPlanAction(d: FormData) {
  const a = await getAuthorizationContext();
  await auditCurriculum(a, String(d.get("studentId")), () =>
    createAndActivatePlan(a, {
      studentId: String(d.get("studentId")),
      termId: String(d.get("termId")),
      versionId: String(d.get("versionId")),
    }),
  );
  refresh(`/students/${d.get("studentId")}`, "/progress");
}
export async function updateLearningItemAction(d: FormData) {
  const a = await getAuthorizationContext();
  await auditCurriculum(a, String(d.get("itemId")), () =>
    adjustLearningItem(a, {
      itemId: String(d.get("itemId")),
      status: String(d.get("status")) as "pending" | "in_progress" | "completed" | "skipped",
    }),
  );
  refresh(`/students/${d.get("studentId")}`, "/progress");
}
