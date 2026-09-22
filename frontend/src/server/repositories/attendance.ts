import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type { AttendanceDayView } from "@/features/attendance/attendance.types";
import { attendanceRows } from "@/server/data/mock/fixtures";
import { classManagementRepository } from "./class-management";
import { buildAttendanceDayView } from "./attendance-core";

export interface AttendanceRepository {
  forDate(actor: AuthorizationContext, date: string, classId?: string): Promise<AttendanceDayView>;
}

export const attendanceRepository: AttendanceRepository = {
  async forDate(actor, date, classId) {
    const expected = await classManagementRepository.expectedAttendance(actor, date);
    return buildAttendanceDayView(expected, attendanceRows, classId);
  },
};
