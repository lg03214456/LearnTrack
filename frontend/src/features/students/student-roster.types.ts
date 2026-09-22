export type StudentRosterStatus = "active" | "leave" | "archived";
export type StudentOperationalStatus = Exclude<StudentRosterStatus, "archived">;
export interface ClassMembership {
  classId: string;
  className: string;
}
export interface StudentListRow {
  id: string;
  organizationId: string;
  number: string;
  name: string;
  gender: "男" | "女";
  phone: string;
  status: StudentRosterStatus;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  classes: ClassMembership[];
}
export interface StudentClassOption {
  id: string;
  name: string;
}
export interface SelectedClassContext extends StudentClassOption {
  capacity: number | null;
}
export interface StudentListSummary {
  totalStudents: number;
  activeStudents: number;
  leaveStudents: number;
  archivedStudents: number;
  contextTotal: number | null;
}
export interface ListStudentsQuery {
  organizationId: string;
  classId?: string;
  accessibleClassIds?: string[];
  accessibleStudentIds?: string[];
  search?: string;
  status?: StudentRosterStatus;
  page: number;
  pageSize: number;
}
export interface StudentListResult {
  state: "ready" | "unavailable-class";
  rows: StudentListRow[];
  classOptions: StudentClassOption[];
  selectedClass?: SelectedClassContext;
  summary: StudentListSummary;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface StudentRosterInput {
  studentId?: string;
  number: string;
  name: string;
  gender: "男" | "女";
  phone: string;
  status: StudentOperationalStatus;
  classIds?: string[];
}

export interface StudentLifecycleCommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
  values: { studentId: string; intent: "archive" | "restore"; reason: string };
  fieldErrors?: { reason?: string };
}

export interface StudentRosterCommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
  values: StudentRosterInput;
  fieldErrors?: Record<string, string>;
}
