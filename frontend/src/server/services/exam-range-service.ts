import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { SaveExamRangeCommand, ExamRangeResult } from "@/features/curriculum/exam-range.types";
import { normalizeExamRangeCommand } from "@/features/curriculum/exam-range-progress";
import { can } from "@/server/authorization/policy";
import { examRangeRepository } from "@/server/repositories/exam-ranges";
import type { ExamRangeRepository } from "@/server/repositories/exam-ranges-contract";
import { RepositoryError } from "@/server/repositories/repository-error";

export async function saveExamRange(
  actor: AuthorizationContext,
  input: SaveExamRangeCommand,
  repository: ExamRangeRepository = examRangeRepository,
): Promise<ExamRangeResult> {
  if (!can(actor, "study_plans.manage")) return { ok: false, message: "無權管理段考範圍" };
  try {
    const workspace = await repository.read(actor, input.studentId);
    const command = normalizeExamRangeCommand(input, workspace);
    await repository.save(actor, command);
    return { ok: true, message: "段考範圍已儲存" };
  } catch (error) {
    if (error instanceof RepositoryError) {
      const messages = {
        CONFLICT: "範圍已被更新，請關閉後重新載入再編輯",
        FORBIDDEN: "無權操作此學生的段考範圍",
        NOT_FOUND: "找不到段考範圍，請重新載入",
        INVALID_RELATIONSHIP: "教材或計畫已變更，請重新確認勾選範圍",
        PERSISTENCE_UNAVAILABLE: "段考範圍暫時無法儲存，請確認 SQL 已套用後重試",
      };
      return { ok: false, message: messages[error.code] };
    }
    if (
      error instanceof Error &&
      [
        "CONFLICT",
        "NOT_FOUND",
        "INVALID_INPUT",
        "INVALID_DATE",
        "INVALID_SELECTION",
        "EMPTY_UNIT",
      ].includes(error.message)
    )
      return {
        ok: false,
        message:
          error.message === "CONFLICT"
            ? "範圍已被更新，請關閉後重新載入再編輯"
            : "請填寫段考名稱、有效日期，並至少選擇一個可用的教材內容（最多 500 項）",
      };
    throw error;
  }
}
