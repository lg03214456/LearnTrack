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
    status: LearningStatus;
    revision: number;
  }[];
}

export interface ClassSessionMemberView {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  attendanceStatus: AttendanceStatus | "pending";
  plans: ClassSessionPlanOption[];
  needsPlanSetup: boolean;
  history: ClassSessionProgressView[];
}

export interface ClassSessionProgressView {
  id: string;
  studentId: string;
  studentName: string;
  planLabel: string;
  learningItemTitle: string;
  statusAfterSession: Exclude<LearningStatus, "skipped">;
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
}

export interface DailyProgressEntryInput {
  sessionMemberId: string;
  studentId: string;
  studyPlanId: string;
  learningItemId: string;
  learningItemRevision: number;
  status: Exclude<LearningStatus, "skipped">;
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
  status: Exclude<LearningStatus, "skipped">;
  note?: string;
  reason: string;
}

export interface DailyProgressCommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
}
