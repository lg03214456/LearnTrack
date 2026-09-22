import "server-only";
import type {
  AuthorizationContext,
  CommandResult,
} from "@/features/access-control/access-control.types";
import type {
  DeleteTemplateItemCommand,
  MoveTemplateItemCommand,
  TemplateItemType,
} from "@/features/curriculum/curriculum.types";
import { can } from "@/server/authorization/policy";
import { curriculumStore, replaceCurriculumVersionItems } from "@/server/data/mock/curriculum";

const result = (ok: boolean, code: CommandResult["code"], message: string): CommandResult => ({
  ok,
  code,
  message,
});
const itemId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const allowedItemTypes: TemplateItemType[] = [
  "chapter",
  "unit",
  "material",
  "worksheet",
  "assessment",
];

function editableVersion(actor: AuthorizationContext, versionId: string, revision: number) {
  const version = curriculumStore.versions.find(
    (row) => row.id === versionId && row.organizationId === actor.organizationId,
  );
  if (!version) return { error: result(false, "NOT_FOUND", "找不到版本") };
  if (version.status !== "draft") return { error: result(false, "CONFLICT", "已發布版本不可修改") };
  if (version.revision !== revision)
    return { error: result(false, "CONFLICT", "版本已更新，請重新載入") };
  return { version };
}

function validParent(
  versionId: string,
  currentItemId: string | undefined,
  parentId: string | undefined,
) {
  if (!parentId) return true;
  const parent = curriculumStore.items.find(
    (row) => row.id === parentId && row.versionId === versionId,
  );
  if (!parent || parent.id === currentItemId) return false;
  let cursor = parent;
  let depth = 1;
  while (cursor.parentId) {
    if (cursor.parentId === currentItemId || depth >= 2) return false;
    const next = curriculumStore.items.find(
      (row) => row.id === cursor.parentId && row.versionId === versionId,
    );
    if (!next) return false;
    cursor = next;
    depth++;
  }
  return true;
}

export function addTemplateItem(
  actor: AuthorizationContext,
  input: {
    versionId: string;
    title: string;
    type: TemplateItemType;
    parentId?: string;
    revision: number;
  },
) {
  if (!can(actor, "curriculum.manage")) return result(false, "FORBIDDEN", "無權管理教材");
  const check = editableVersion(actor, input.versionId, input.revision);
  if (check.error) return check.error;
  const existing = curriculumStore.items.filter((row) => row.versionId === input.versionId);
  const parent = input.parentId ? existing.find((row) => row.id === input.parentId) : undefined;
  if (!input.title.trim() || !allowedItemTypes.includes(input.type) || (input.parentId && !parent))
    return result(false, "VALIDATION_ERROR", "教材項目或父項目無效");
  if (parent?.parentId) return result(false, "VALIDATION_ERROR", "教材階層最多兩層");
  curriculumStore.addItems([
    {
      id: `item-${itemId()}`,
      organizationId: actor.organizationId,
      versionId: input.versionId,
      parentId: parent?.id,
      type: input.type,
      title: input.title.trim(),
      position: existing.length,
    },
  ]);
  curriculumStore.updateVersion({ ...check.version!, revision: check.version!.revision + 1 });
  return result(true, "OK", "項目已新增");
}

export function updateTemplateItem(
  actor: AuthorizationContext,
  input: {
    versionId: string;
    itemId: string;
    title: string;
    type: TemplateItemType;
    parentId?: string;
    revision: number;
  },
) {
  if (!can(actor, "curriculum.manage")) return result(false, "FORBIDDEN", "無權管理教材");
  const check = editableVersion(actor, input.versionId, input.revision);
  if (check.error) return check.error;
  const item = curriculumStore.items.find(
    (row) => row.id === input.itemId && row.versionId === input.versionId,
  );
  if (!item) return result(false, "NOT_FOUND", "找不到教材項目");
  if (
    !input.title.trim() ||
    !allowedItemTypes.includes(input.type) ||
    !validParent(input.versionId, item.id, input.parentId)
  )
    return result(false, "VALIDATION_ERROR", "教材項目或階層無效");
  curriculumStore.updateItems([
    { ...item, title: input.title.trim(), type: input.type, parentId: input.parentId },
  ]);
  curriculumStore.updateVersion({ ...check.version!, revision: check.version!.revision + 1 });
  return result(true, "OK", "教材項目已更新");
}

export function reorderTemplateItems(
  actor: AuthorizationContext,
  input: { versionId: string; orderedItemIds: string[]; revision: number },
) {
  if (!can(actor, "curriculum.manage")) return result(false, "FORBIDDEN", "無權管理教材");
  const check = editableVersion(actor, input.versionId, input.revision);
  if (check.error) return check.error;
  const items = curriculumStore.items.filter((row) => row.versionId === input.versionId);
  if (
    new Set(input.orderedItemIds).size !== items.length ||
    items.some((row) => !input.orderedItemIds.includes(row.id))
  )
    return result(false, "VALIDATION_ERROR", "排序項目不完整");
  curriculumStore.updateItems(
    input.orderedItemIds.map((id, position) => ({
      ...items.find((row) => row.id === id)!,
      position,
    })),
  );
  curriculumStore.updateVersion({ ...check.version!, revision: check.version!.revision + 1 });
  return result(true, "OK", "教材順序已更新");
}

const orderedVersionItems = (versionId: string) =>
  curriculumStore.items
    .filter((row) => row.versionId === versionId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
const compactPositions = (versionId: string, items: ReturnType<typeof orderedVersionItems>) =>
  replaceCurriculumVersionItems(
    versionId,
    items.map((item, position) => ({ ...item, position })),
  );

export function deleteTemplateItem(actor: AuthorizationContext, input: DeleteTemplateItemCommand) {
  if (!can(actor, "curriculum.manage")) return result(false, "FORBIDDEN", "無權管理教材");
  const check = editableVersion(actor, input.versionId, input.revision);
  if (check.error) return check.error;
  const current = orderedVersionItems(input.versionId);
  const target = current.find((row) => row.id === input.itemId);
  if (!target) return result(false, "NOT_FOUND", "找不到教材項目");
  const childIds = new Set(
    current.filter((row) => row.parentId === target.id).map((row) => row.id),
  );
  compactPositions(
    input.versionId,
    current.filter((row) => row.id !== target.id && !childIds.has(row.id)),
  );
  curriculumStore.updateVersion({ ...check.version!, revision: check.version!.revision + 1 });
  return result(true, "OK", childIds.size ? "項目與子項目已刪除" : "項目已刪除");
}

export function moveTemplateItem(actor: AuthorizationContext, input: MoveTemplateItemCommand) {
  if (!can(actor, "curriculum.manage")) return result(false, "FORBIDDEN", "無權管理教材");
  const check = editableVersion(actor, input.versionId, input.revision);
  if (check.error) return check.error;
  if (input.direction !== "up" && input.direction !== "down")
    return result(false, "VALIDATION_ERROR", "移動方向無效");
  const current = orderedVersionItems(input.versionId);
  const index = current.findIndex((row) => row.id === input.itemId);
  if (index < 0) return result(false, "NOT_FOUND", "找不到教材項目");
  const adjacent = input.direction === "up" ? index - 1 : index + 1;
  if (adjacent < 0 || adjacent >= current.length)
    return result(false, "VALIDATION_ERROR", "項目已在排序邊界");
  [current[index], current[adjacent]] = [current[adjacent], current[index]];
  compactPositions(input.versionId, current);
  curriculumStore.updateVersion({ ...check.version!, revision: check.version!.revision + 1 });
  return result(true, "OK", input.direction === "up" ? "項目已上移" : "項目已下移");
}
