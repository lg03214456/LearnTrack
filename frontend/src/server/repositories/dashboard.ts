import "server-only";
import type { AttendanceRow } from "@/features/attendance/attendance.types";
import type { Analytics } from "@/features/analytics/analytics.types";
import type { ProgressRow } from "@/features/progress/progress.types";
import type { ClassRow } from "@/server/domain/types";
import {
  attendanceRows,
  classRows,
  ORG,
  progressRows,
  students,
} from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { selectDomainRepository } from "./domain-provider";
import { supabaseDashboardRepository } from "./dashboard-supabase";
export interface DashboardRepository {
  progress(organizationId: string, classIds?: string[]): Promise<ProgressRow[]>;
  classes(organizationId: string, classIds?: string[]): Promise<ClassRow[]>;
  attendance(organizationId: string): Promise<AttendanceRow[]>;
  analytics(organizationId: string, classIds?: string[]): Promise<Analytics>;
}
class MockDashboardRepository implements DashboardRepository {
  async progress(organizationId: string, classIds?: string[]) {
    const names = classIds?.map((id) => classRows.find((x) => x.id === id)?.name);
    return progressRows.filter(
      (row) =>
        (!names || names.includes(row.className)) &&
        students.some(
          (student) =>
            student.id === row.studentId &&
            student.organizationId === organizationId &&
            student.status !== "archived",
        ),
    );
  }
  async classes(organizationId: string, classIds?: string[]) {
    return classRows
      .filter((x) => x.organizationId === organizationId && (!classIds || classIds.includes(x.id)))
      .map((row) => ({
        ...row,
        students: new Set(
          enrollments
            .filter(
              (x) =>
                x.organizationId === organizationId &&
                x.classId === row.id &&
                x.status === "active",
            )
            .map((x) => x.studentId),
        ).size,
      }));
  }
  async attendance() {
    return attendanceRows;
  }
  async analytics(organizationId: string, classIds?: string[]) {
    const classes = await this.classes(organizationId, classIds);
    return {
      averageScore: 78.5,
      completion: 82,
      participation: 92,
      atRisk: 2,
      trend: [
        { month: "3月", score: 68 },
        { month: "4月", score: 74 },
        { month: "5月", score: 72 },
        { month: "6月", score: 80 },
        { month: "7月", score: 84 },
        { month: "8月", score: 88 },
      ],
      bands: [
        { label: "90–100分（優異）", value: 15, color: "#155e75" },
        { label: "80–89分（良好）", value: 35, color: "#3b82f6" },
        { label: "70–79分（中等）", value: 30, color: "#64748b" },
        { label: "60–69分（及格）", value: 12, color: "#f59e0b" },
        { label: "60分以下（需加強）", value: 8, color: "#dc2626" },
      ],
      classes: classes.map((x, i) => ({
        name: x.name,
        teacher: x.teacherName,
        progress: x.progress,
        score: [82, 74, 62][i] ?? 70,
        status: i === 2 ? "需多關注" : i === 1 ? "穩定正常" : "表現優良",
      })),
    };
  }
}
const mockDashboardRepository = new MockDashboardRepository();
export const dashboardRepository: DashboardRepository = {
  progress(organizationId, classIds) {
    return selectDomainRepository({
      mock: mockDashboardRepository,
      supabase: supabaseDashboardRepository,
    }).progress(organizationId, classIds);
  },
  classes: (organizationId, classIds) => mockDashboardRepository.classes(organizationId, classIds),
  attendance: () => mockDashboardRepository.attendance(),
  analytics: (organizationId, classIds) =>
    mockDashboardRepository.analytics(organizationId, classIds),
};
export { ORG };
