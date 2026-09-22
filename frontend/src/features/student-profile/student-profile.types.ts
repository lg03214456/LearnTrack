import type { CommandResult } from "@/features/access-control/access-control.types";
import type { StudentRosterStatus } from "@/features/students/student-roster.types";
export interface GuardianView {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}
export interface StudentProfileView {
  id: string;
  number: string;
  name: string;
  gender: "男" | "女";
  phone: string;
  school: string;
  grade: string;
  status: StudentRosterStatus;
  revision: number;
  guardians: GuardianView[];
  classes: { id: string; name: string }[];
}
export interface AssessmentOption {
  id: string;
  termId: string;
  subject: string;
  title: string;
  date: string;
  maximumScore: number;
}
export interface AssessmentResultView {
  id: string;
  assessmentId: string;
  title: string;
  termId: string;
  subject: string;
  date: string;
  score: number;
  maximumScore: number;
  percentage: number;
  comment: string;
  revision: number;
  updatedAt: string;
}
export interface AssessmentFilters {
  termId?: string;
  subject?: string;
  page: number;
  pageSize: number;
}
export interface AssessmentSummary {
  latestPercentage: number | null;
  averagePercentage: number | null;
  resultCount: number;
  trend: { label: string; percentage: number }[];
}
export interface CourseSessionView {
  id: string;
  date: string;
  classId: string;
  className: string;
  subject: string;
  attendance: "present" | "late" | "absent" | "leave";
  content: string;
  progress: string;
  score: number | null;
  comment: string;
  supersedesId?: string;
  correctionReason?: string;
}
export interface StudentDetailView {
  profile: StudentProfileView;
  sessions: CourseSessionView[];
  assessment: {
    rows: AssessmentResultView[];
    exportRows: AssessmentResultView[];
    summary: AssessmentSummary;
    terms: { id: string; name: string }[];
    subjects: string[];
    availableAssessments: AssessmentOption[];
    pagination: { page: number; total: number; totalPages: number };
  };
}
export interface UpdateStudentProfileCommand {
  studentId: string;
  phone: string;
  school: string;
  grade: string;
  guardianId: string;
  guardianName: string;
  guardianPhone: string;
  revision: number;
}
export interface RecordAssessmentResultCommand {
  studentId: string;
  assessmentId: string;
  score: number;
  comment: string;
}
export interface CorrectAssessmentResultCommand {
  resultId: string;
  score: number;
  comment: string;
  revision: number;
}
export type StudentDetailCommandResult = CommandResult;
