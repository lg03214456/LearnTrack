"use server";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/server/auth/identity";
import { getAuthProviders } from "@/server/auth/providers";
import { executeAuditedMutation } from "@/server/audit/audit-service";
import { saveExamRange } from "@/server/services/exam-range-service";
import type { ExamRangeResult, SaveExamRangeCommand } from "@/features/curriculum/exam-range.types";

export async function saveExamRangeAction(
  command: SaveExamRangeCommand,
  contextKey?: string,
): Promise<ExamRangeResult> {
  const actor = await getAuthorizationContext();
  if (contextKey !== undefined && contextKey !== `${actor.organizationId}:${actor.membershipId}`)
    return { ok: false, message: "登入身分已變更，請重新開啟設定。" };
  try {
    const result = await executeAuditedMutation({
      repository: getAuthProviders().audit,
      event: {
        actor,
        organizationId: actor.organizationId,
        action: "curriculum.changed",
        resourceType: "student_exam_range",
        resourceId: command.rangeId ?? command.studentId,
      },
      mutate: () => saveExamRange(actor, command),
    });
    if (result.ok) revalidatePath(`/students/${encodeURIComponent(command.studentId)}`);
    return result;
  } catch {
    return {
      ok: false,
      isUncertain: true,
      message: "無法確認儲存結果，請重新載入檢查；若仍失敗，請確認稽核服務與資料庫設定",
    };
  }
}
