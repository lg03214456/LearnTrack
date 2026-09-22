import type { AttendanceStatus } from "@/features/attendance/attendance.types";
import type { ClassSessionStatus } from "@/features/class-sessions/class-session.types";
import type { LearningStatus } from "@/features/curriculum/curriculum.types";
import { ORG } from "./fixtures";

export interface ClassSessionRecord {
  id: string;
  organizationId: string;
  classId: string;
  sessionDate: string;
  scheduleId?: string;
  teacherProfileId: string;
  status: ClassSessionStatus;
  createdAt: string;
  completedAt?: string;
  revision: number;
}

export interface ClassSessionMemberRecord {
  id: string;
  organizationId: string;
  classSessionId: string;
  studentId: string;
  enrollmentId: string;
  attendanceStatus: AttendanceStatus | "pending";
}

export interface StudentSessionProgressRecord {
  id: string;
  organizationId: string;
  classSessionId: string;
  sessionMemberId: string;
  studentId: string;
  studyPlanId: string;
  learningItemId: string;
  statusAfterSession: Exclude<LearningStatus, "skipped">;
  note?: string;
  recordedBy: string;
  recordedAt: string;
  supersedesId?: string;
  correctionReason?: string;
  revision: number;
}

const initialSessions: ClassSessionRecord[] = [
  {
    id: "class-session-1",
    organizationId: ORG,
    classId: "cls-1",
    sessionDate: "2026-08-31",
    scheduleId: "slot-cls-1-0",
    teacherProfileId: "teacher",
    status: "draft",
    createdAt: "2026-08-31T10:00:00.000Z",
    revision: 1,
  },
];

const initialMembers: ClassSessionMemberRecord[] = [
  ["session-member-1", "stu-1", "enrollment-1", "present"],
  ["session-member-2", "stu-2", "enrollment-3", "late"],
  ["session-member-3", "stu-3", "enrollment-4", "absent"],
].map(([id, studentId, enrollmentId, attendanceStatus]) => ({
  id,
  organizationId: ORG,
  classSessionId: "class-session-1",
  studentId,
  enrollmentId,
  attendanceStatus: attendanceStatus as AttendanceStatus,
}));

const initialProgress: StudentSessionProgressRecord[] = [];
let sessions = structuredClone(initialSessions);
let members = structuredClone(initialMembers);
let progress = structuredClone(initialProgress);
let sequence = 10;

export const classSessionStore = {
  get sessions() {
    return sessions;
  },
  get members() {
    return members;
  },
  get progress() {
    return progress;
  },
  reset() {
    sessions = structuredClone(initialSessions);
    members = structuredClone(initialMembers);
    progress = structuredClone(initialProgress);
    sequence = 10;
  },
  snapshot() {
    return structuredClone({ sessions, members, progress, sequence });
  },
  restore(snapshot: ReturnType<typeof this.snapshot>) {
    sessions = snapshot.sessions;
    members = snapshot.members;
    progress = snapshot.progress;
    sequence = snapshot.sequence;
  },
  addSession(record: ClassSessionRecord, roster: ClassSessionMemberRecord[]) {
    sessions = [...sessions, record];
    members = [...members, ...roster];
  },
  updateSession(record: ClassSessionRecord) {
    sessions = sessions.map((item) => (item.id === record.id ? record : item));
  },
  appendProgress(records: StudentSessionProgressRecord[]) {
    progress = [...progress, ...records];
  },
  nextId(prefix: string) {
    return `${prefix}-${sequence++}`;
  },
};
