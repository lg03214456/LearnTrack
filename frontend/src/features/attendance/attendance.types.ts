export type AttendanceStatus = "present" | "late" | "absent" | "leave";

export interface AttendanceRow {
  studentId: string;
  name: string;
  number: string;
  status: AttendanceStatus;
  note: string;
}

export interface AttendanceDayView {
  rows: AttendanceRow[];
  classOptions: { id: string; name: string }[];
}
