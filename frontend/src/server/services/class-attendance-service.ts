import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  DailyProgressCommandResult,
  SaveClassAttendanceCommand,
} from "@/features/class-sessions/class-session.types";
import { isClassAttendanceCommand } from "@/features/class-sessions/class-attendance";
import { can } from "@/server/authorization/policy";
import { classAttendanceRepository } from "@/server/repositories/class-attendance";
import { RepositoryError } from "@/server/repositories/repository-error";

export async function saveClassAttendance(
  actor: AuthorizationContext,
  command: SaveClassAttendanceCommand,
): Promise<DailyProgressCommandResult> {
  if (!can(actor, "attendance.manage") || !can(actor, "attendance.read"))
    return { ok: false, code: "FORBIDDEN", message: "無權更新點名" };
  if (!isClassAttendanceCommand(command))
    return { ok: false, code: "VALIDATION_ERROR", message: "請確認點名狀態、時間與更正原因" };
  try {
    await classAttendanceRepository.save(actor, command);
    return { ok: true, code: "OK", message: "課堂點名已儲存" };
  } catch (error) {
    if (!(error instanceof RepositoryError) || error.code === "PERSISTENCE_UNAVAILABLE")
      throw error;
    const code = error.code === "INVALID_RELATIONSHIP" ? "VALIDATION_ERROR" : error.code;
    return {
      ok: false,
      code,
      message:
        code === "CONFLICT"
          ? "點名或課堂已被更新，請重新載入"
          : code === "FORBIDDEN"
            ? "無權更新點名"
            : "請確認學生、到課時間與更正／補登原因",
    };
  }
}
