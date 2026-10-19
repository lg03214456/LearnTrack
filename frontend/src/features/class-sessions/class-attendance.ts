import type { SaveClassAttendanceCommand } from "./class-session.types";

export const CLASS_ATTENDANCE_LABELS = {
  present: "出席",
  late: "遲到",
  leave: "請假",
  absent: "缺席",
} as const;

/** Validates transport shape too: Server Actions and RPC callers are untrusted. */
export function isClassAttendanceCommand(value: unknown): value is SaveClassAttendanceCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as SaveClassAttendanceCommand;
  if (
    typeof command.sessionId !== "string" ||
    !command.sessionId ||
    !Number.isSafeInteger(command.sessionRevision) ||
    command.sessionRevision < 1 ||
    typeof command.reason !== "string" ||
    command.reason.trim().length > 200 ||
    !Array.isArray(command.entries) ||
    !command.entries.length ||
    command.entries.length > 200
  )
    return false;
  const members = new Set<string>();
  return command.entries.every((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.sessionMemberId !== "string" ||
      !entry.sessionMemberId ||
      typeof entry.studentId !== "string" ||
      !entry.studentId ||
      !Object.hasOwn(CLASS_ATTENDANCE_LABELS, entry.status) ||
      (entry.previousRecordId !== undefined &&
        (typeof entry.previousRecordId !== "string" || !entry.previousRecordId)) ||
      (entry.arrivalTime !== undefined &&
        (typeof entry.arrivalTime !== "string" ||
          (entry.arrivalTime !== "" &&
            (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.arrivalTime) || entry.status !== "late")))) ||
      members.has(entry.sessionMemberId)
    )
      return false;
    members.add(entry.sessionMemberId);
    return true;
  });
}

export function arrivalTimeInTaipei(arrivedAt?: string) {
  if (!arrivedAt || !Number.isFinite(Date.parse(arrivedAt))) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(arrivedAt));
}

export function classRecordTime(recordedAt: string) {
  if (!Number.isFinite(Date.parse(recordedAt))) return "時間未提供";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(recordedAt));
}
