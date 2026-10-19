import type { StudentClassOption, StudentRosterInput } from "./student-roster.types";
import type { StudentStudyPlanPage } from "../curriculum/curriculum.types";
import type { ExamRangeWorkspace } from "../curriculum/exam-range.types";

export type SetupRead<T> =
  { status: "ready"; value: T } | { status: "forbidden" | "unavailable"; message: string };

export interface StudentSetupData {
  contextKey: string;
  basic: StudentRosterInput;
  classOptions: StudentClassOption[];
  canManageClasses: boolean;
}
export interface StudentLearningSetup {
  plans: SetupRead<StudentStudyPlanPage>;
  ranges: SetupRead<ExamRangeWorkspace>;
  canManage: boolean;
}
export type StudentSetupStep = "basic" | "materials" | "range" | "complete";
