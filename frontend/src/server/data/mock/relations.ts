import type {
  Assessment,
  AssessmentResult,
  AttendanceRecord,
  Enrollment,
  LessonProgress,
  Organization,
  Profile,
  Teacher,
} from "@/server/domain/types";
import { attendanceRows, classRows, ORG, progressRows } from "./fixtures";

export const organizations: Organization[] = [{ id: ORG, name: "補教紀錄" }];
export const profiles: Profile[] = [
  { id: "profile-1", organizationId: ORG, name: "系統管理員", role: "admin" },
  { id: "profile-2", organizationId: ORG, name: "林老師", role: "teacher" },
];
export const teachers: Teacher[] = [
  { id: "teacher-1", organizationId: ORG, profileId: "profile-2", name: "林老師" },
];

export const enrollments: Enrollment[] = [
  {
    id: "enrollment-1",
    organizationId: ORG,
    studentId: "stu-1",
    classId: "cls-1",
    status: "active",
  },
  {
    id: "enrollment-2",
    organizationId: ORG,
    studentId: "stu-1",
    classId: "cls-2",
    status: "active",
  },
  {
    id: "enrollment-3",
    organizationId: ORG,
    studentId: "stu-2",
    classId: "cls-1",
    status: "active",
  },
  {
    id: "enrollment-4",
    organizationId: ORG,
    studentId: "stu-3",
    classId: "cls-1",
    status: "active",
  },
  {
    id: "enrollment-5",
    organizationId: ORG,
    studentId: "stu-4",
    classId: "cls-2",
    status: "active",
  },
  {
    id: "enrollment-6",
    organizationId: ORG,
    studentId: "stu-5",
    classId: "cls-2",
    status: "active",
  },
  {
    id: "enrollment-7",
    organizationId: ORG,
    studentId: "stu-6",
    classId: "cls-3",
    status: "active",
  },
];

export const attendanceRecords: AttendanceRecord[] = attendanceRows.map((record, index) => ({
  id: `attendance-${index + 1}`,
  organizationId: ORG,
  studentId: record.studentId,
  classId: enrollments.find((enrollment) => enrollment.studentId === record.studentId)!.classId,
  status: record.status,
}));
export const assessments: Assessment[] = classRows.map((courseClass, index) => ({
  id: `assessment-${index + 1}`,
  organizationId: ORG,
  classId: courseClass.id,
  title: `${courseClass.subject}階段測驗`,
}));
export const assessmentResults: AssessmentResult[] = progressRows.map((progress, index) => ({
  id: `result-${index + 1}`,
  organizationId: ORG,
  assessmentId: assessments.find(
    (assessment) =>
      assessment.classId ===
      enrollments.find((enrollment) => enrollment.studentId === progress.studentId)!.classId,
  )!.id,
  studentId: progress.studentId,
  score: progress.score,
}));
export const lessonProgress: LessonProgress[] = progressRows.map((progress, index) => ({
  id: `lesson-progress-${index + 1}`,
  organizationId: ORG,
  studentId: progress.studentId,
  classId: enrollments.find((enrollment) => enrollment.studentId === progress.studentId)!.classId,
  completed: progress.completed,
  total: progress.total,
}));
