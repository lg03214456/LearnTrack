import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  AddTemplateItemCommand,
  CreateTemplateCommand,
  CreateStudyPlanCommand,
  DeleteTemplateItemCommand,
  MoveTemplateItemCommand,
  ReorderTemplateItemsCommand,
  CurriculumCommandResult,
  UpdateTemplateCommand,
  UpdateTemplateItemCommand,
} from "@/features/curriculum/curriculum.types";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import {
  supabaseCurriculumRepository,
  type CurriculumOperation,
} from "@/server/repositories/curriculum-supabase";
import { RepositoryError } from "@/server/repositories/repository-error";
import * as mock from "./curriculum-service";
import { curriculumRepository } from "@/server/repositories/curriculum";

export async function updateTemplate(
  actor: AuthorizationContext,
  command: UpdateTemplateCommand,
): Promise<CurriculumCommandResult> {
  if (
    !command.templateId ||
    !Number.isInteger(command.revision) ||
    command.revision < 1 ||
    !command.name.trim() ||
    command.name.trim().length > 200
  )
    return { ok: false, code: "VALIDATION_ERROR", message: "請填寫教材名稱（最多 200 字）" };
  try {
    await curriculumRepository.updateTemplate(actor, command);
    return { ok: true, code: "OK", message: "教材基本資料已儲存" };
  } catch (error) {
    if (!(error instanceof RepositoryError) || error.code === "PERSISTENCE_UNAVAILABLE")
      throw error;
    return {
      ok: false,
      code: error.code === "INVALID_RELATIONSHIP" ? "VALIDATION_ERROR" : error.code,
      message:
        error.code === "CONFLICT"
          ? "名稱重複、資料已更新，或已發布教材不可變更年級與科目；請重新載入"
          : error.code === "FORBIDDEN"
            ? "無權管理教材"
            : "請確認教材與分類設定",
    };
  }
}

export const updateTemplateItem = (
  actor: AuthorizationContext,
  command: UpdateTemplateItemCommand,
) => persist(actor, "updateItem", { ...command }, () => mock.updateTemplateItem(actor, command));

async function persist(
  actor: AuthorizationContext,
  operation: CurriculumOperation,
  command: Record<string, unknown>,
  fallback: () => CurriculumCommandResult,
): Promise<CurriculumCommandResult> {
  if (authRuntimeConfig().domainDataProvider === "mock") return fallback();
  try {
    const id = await supabaseCurriculumRepository.mutate(actor, operation, command);
    return {
      ok: true,
      code: "OK",
      message:
        operation === "create" || operation === "copy"
          ? id!
          : operation === "replacePlan"
            ? "修課計畫已啟用或更換"
            : "教材與進度已儲存",
    };
  } catch (error) {
    if (!(error instanceof RepositoryError) || error.code === "PERSISTENCE_UNAVAILABLE")
      throw error;
    const code = error.code === "INVALID_RELATIONSHIP" ? "VALIDATION_ERROR" : error.code;
    return {
      ok: false,
      code,
      message:
        code === "CONFLICT"
          ? "資料已被更新或此版本已在使用，請重新整理"
          : code === "FORBIDDEN"
            ? "無權管理這筆教材或修課計畫"
            : code === "NOT_FOUND"
              ? "找不到教材或學習項目"
              : "請確認分類、版本、項目與學期設定",
    };
  }
}

export const createTemplate = (actor: AuthorizationContext, command: CreateTemplateCommand) =>
  persist(actor, "create", { ...command }, () => mock.createTemplate(actor, command));
export const publishVersion = (actor: AuthorizationContext, versionId: string, revision: number) =>
  persist(actor, "publish", { versionId, revision }, () => mock.publishVersion(actor, versionId));
export const copyVersion = (actor: AuthorizationContext, versionId: string, revision: number) =>
  persist(actor, "copy", { versionId, revision }, () => mock.copyVersion(actor, versionId));
export const archiveTemplate = (actor: AuthorizationContext, templateId: string) =>
  persist(actor, "archive", { templateId }, () => mock.archiveTemplate(actor, templateId));
export const addTemplateItem = (actor: AuthorizationContext, command: AddTemplateItemCommand) =>
  persist(actor, "addItem", { ...command }, () => mock.addTemplateItem(actor, command));
export const deleteTemplateItem = (
  actor: AuthorizationContext,
  command: DeleteTemplateItemCommand,
) => persist(actor, "deleteItem", { ...command }, () => mock.deleteTemplateItem(actor, command));
export const moveTemplateItem = (actor: AuthorizationContext, command: MoveTemplateItemCommand) =>
  persist(actor, "moveItem", { ...command }, () => mock.moveTemplateItem(actor, command));
export const reorderTemplateItems = (
  actor: AuthorizationContext,
  command: ReorderTemplateItemsCommand,
) => persist(actor, "reorder", { ...command }, () => mock.reorderTemplateItems(actor, command));
export const createAndActivatePlan = (
  actor: AuthorizationContext,
  command: CreateStudyPlanCommand,
) =>
  persist(actor, "replacePlan", { ...command }, () => mock.createAndActivatePlan(actor, command));
export const adjustLearningItem = (
  actor: AuthorizationContext,
  command: {
    itemId: string;
    revision: number;
    title?: string;
    status: "pending" | "in_progress" | "completed" | "skipped";
  },
) => persist(actor, "adjustItem", { ...command }, () => mock.adjustLearningItem(actor, command));
