export type ClassType = "progress" | "individual" | "study";
export type ClassLifecycle = "recruiting" | "active" | "completed" | "archived";
export interface WeeklyScheduleSlot {
  weekday: number;
  startTime: string;
  endTime: string;
  room: string;
}
export interface ClassAggregateInput {
  classId?: string;
  revision?: number;
  name: string;
  code: string;
  type: ClassType;
  subjectIds: string[];
  gradeIds: string[];
  allGrades: boolean;
  teacherId: string;
  capacity: number | null;
  status: ClassLifecycle;
  schedules: WeeklyScheduleSlot[];
  studentIds: string[];
}
export interface ClassCommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
  fieldErrors?: Record<string, string>;
  values?: ClassAggregateInput;
}
export interface ClassCapability {
  canCreate: boolean;
  canEdit: boolean;
  canChangeTeacher: boolean;
  canChangeLifecycle: boolean;
}
export interface ClassOverviewRow {
  id: string;
  name: string;
  code: string;
  type: ClassType;
  subjects: string[];
  grades: string[];
  allGrades: boolean;
  teacherName: string;
  capacity: number | null;
  studentCount: number;
  status: ClassLifecycle;
  schedules: WeeklyScheduleSlot[];
  progress: number;
  revision: number;
  capabilities: ClassCapability;
}
export interface ClassEditorOption {
  id: string;
  label: string;
}
export interface StudentEditorOption extends ClassEditorOption {
  number: string;
  selected: boolean;
}
export interface ClassEditorView {
  mode: "create" | "edit";
  initial: ClassAggregateInput;
  teacherOptions: ClassEditorOption[];
  subjectOptions: ClassEditorOption[];
  gradeOptions: ClassEditorOption[];
  studentOptions: StudentEditorOption[];
  capabilities: ClassCapability;
}
export interface ExpectedAttendanceClass {
  classId: string;
  className: string;
  schedules: WeeklyScheduleSlot[];
  students: { studentId: string; name: string; number: string }[];
}
