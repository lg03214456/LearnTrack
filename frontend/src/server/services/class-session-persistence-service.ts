import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  AppendCompletedProgressCommand,
  CorrectDailyProgressCommand,
  DailyProgressCommandResult,
  SaveDailyProgressCommand,
} from "@/features/class-sessions/class-session.types";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { RepositoryError } from "@/server/repositories/repository-error";
import { supabaseClassSessionRepository } from "@/server/repositories/class-session-supabase";
import * as mock from "./class-session-service";

async function persist(
  actor: AuthorizationContext,
  operation: "save" | "append" | "complete" | "correct",
  command: Record<string, unknown>,
  fallback: () => DailyProgressCommandResult,
): Promise<DailyProgressCommandResult> {
  if (authRuntimeConfig().domainDataProvider === "mock") return fallback();
  try {
    await supabaseClassSessionRepository.mutate(actor, operation, command);
    return {
      ok: true,
      code: "OK",
      message: operation === "complete" ? "今日課堂已完成" : "課堂進度已儲存",
    };
  } catch (error) {
    if (!(error instanceof RepositoryError)) throw error;
    const code = error.code === "INVALID_RELATIONSHIP" ? "VALIDATION_ERROR" : error.code;
    if (code === "PERSISTENCE_UNAVAILABLE") throw error;
    return {
      ok: false,
      code,
      message:
        code === "CONFLICT"
          ? "資料已被更新，請重新整理"
          : code === "FORBIDDEN"
            ? "無權更新這堂課"
            : "請確認學生、教材與進度資料",
    };
  }
}

export const saveDailyProgress = (actor: AuthorizationContext, command: SaveDailyProgressCommand) =>
  persist(actor, "save", { ...command }, () => mock.saveDailyProgress(actor, command));
export const appendCompletedProgress = (
  actor: AuthorizationContext,
  command: AppendCompletedProgressCommand,
) => persist(actor, "append", { ...command }, () => mock.appendCompletedProgress(actor, command));
export const completeClassSession = (
  actor: AuthorizationContext,
  sessionId: string,
  sessionRevision: number,
) =>
  persist(actor, "complete", { sessionId, sessionRevision }, () =>
    mock.completeClassSession(actor, sessionId, sessionRevision),
  );
export const correctDailyProgress = (
  actor: AuthorizationContext,
  command: CorrectDailyProgressCommand,
) => persist(actor, "correct", { ...command }, () => mock.correctDailyProgress(actor, command));
