import type { AttendanceStatus } from "@/features/attendance/attendance.types";

export type StudentStatus = "active" | "leave" | "archived";

export interface Organization {
  id: string;
  name: string;
}
export interface Profile {
  id: string;
  organizationId: string;
  name: string;
  role: "admin" | "teacher";
}
export interface Teacher {
  id: string;
  organizationId: string;
  profileId: string;
  name: string;
}
export interface Enrollment {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  status: "active" | "withdrawn";
}
export interface AttendanceRecord {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  status: AttendanceStatus;
}
export interface Assessment {
  id: string;
  organizationId: string;
  classId: string;
  title: string;
}
export interface AssessmentResult {
  id: string;
  organizationId: string;
  assessmentId: string;
  studentId: string;
  score: number;
}
export interface LessonProgress {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  completed: number;
  total: number;
}

export interface StudentRecord {
  id: string;
  organizationId: string;
  number: string;
  name: string;
  gender: "男" | "女";
  phone: string;
  status: StudentStatus;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  revision?: number;
}

export interface ClassRow {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  grade: string;
  subject: string;
  schedule: string;
  capacity: number | null;
  status: string;
  teacherName: string;
  students: number;
  progress: number;
}
