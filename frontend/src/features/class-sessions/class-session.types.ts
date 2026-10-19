import type { AttendanceStatus } from "@/features/attendance/attendance.types";
import type { LearningStatus } from "@/features/curriculum/curriculum.types";

export type ClassSessionStatus = "draft" | "completed";

export interface ClassSessionPlanOption {
  id: string;
  label: string;
  versionLabel: string;
  items: {
    id: string;
    title: string;
    status: Exclude<LearningStatus, "skipped" | "removed">;
    revision: number;
  }[];
}

export interface ClassSessionMemberView {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  attendanceStatus: AttendanceStatus | "pending";
  attendance?: { id: string; arrivedAt?: string; recordedAt: string; revision: number };
  plans: ClassSessionPlanOption[];
  needsPlanSetup: boolean;
  history: ClassSessionProgressView[];
}

export interface ClassSessionProgressView {
  id: string;
  studentId: string;
  studentName: string;
  planLabel: string;
  studyPlanId?: string;
  versionId?: string;
  versionLabel?: string;
  learningItemId?: string;
  itemPosition?: number;
  learningItemTitle: string;
  statusAfterSession: Exclude<LearningStatus, "skipped" | "removed">;
  note?: string;
  recordedAt: string;
  recordedBy: string;
  supersedesId?: string;
  correctionReason?: string;
  revision: number;
}

export interface ClassDailyWorkspace {
  session: {
    id: string;
    classId: string;
    className: string;
    classCode: string;
    sessionDate: string;
    scheduleLabel: string;
    teacherName: string;
    status: ClassSessionStatus;
    revision: number;
  };
  members: ClassSessionMemberView[];
  history: ClassSessionProgressView[];
  canManage: boolean;
  attendanceAvailable?: boolean;
  canManageAttendance?: boolean;
}

export interface ClassAttendanceEntry {
  sessionMemberId: string;
  studentId: string;
  status: AttendanceStatus;
  arrivalTime?: string;
  previousRecordId?: string;
}

export interface SaveClassAttendanceCommand {
  sessionId: string;
  sessionRevision: number;
  entries: ClassAttendanceEntry[];
  reason: string;
}

export interface DailyProgressEntryInput {
  sessionMemberId: string;
  studentId: string;
  studyPlanId: string;
  learningItemId: string;
  learningItemRevision: number;
  status: Exclude<LearningStatus, "skipped" | "removed">;
  note?: string;
}

export interface SaveDailyProgressCommand {
  sessionId: string;
  sessionRevision: number;
  entries: DailyProgressEntryInput[];
}

export interface AppendCompletedProgressCommand extends SaveDailyProgressCommand {
  reason: string;
}

export interface CorrectDailyProgressCommand {
  progressId: string;
  revision: number;
  status: Exclude<LearningStatus, "skipped" | "removed">;
  note?: string;
  reason: string;
}

export interface DailyProgressCommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
}
