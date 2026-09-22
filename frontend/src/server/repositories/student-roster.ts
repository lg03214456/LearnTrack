import "server-only";
import type {
  ListStudentsQuery,
  StudentListResult,
} from "@/features/students/student-roster.types";
import { students } from "@/server/data/mock/fixtures";
import { classManagementStore, classReferenceData } from "@/server/data/mock/class-management";
import type { ClassRow, Enrollment } from "@/server/domain/types";
import { buildStudentListResult } from "./student-roster-core";

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
function buildClassRows(): ClassRow[] {
  return classManagementStore.classes.map((courseClass) => {
    const subjectLabels = classManagementStore.subjects
      .filter((x) => x.classId === courseClass.id)
      .map((x) => classReferenceData.subjects.find((option) => option.id === x.subjectId)?.label)
      .filter((label): label is string => Boolean(label));
    const gradeLabels = classManagementStore.grades
      .filter((x) => x.classId === courseClass.id)
      .map((x) =>
        x.gradeId === "all"
          ? "全年級"
          : classReferenceData.grades.find((option) => option.id === x.gradeId)?.label,
      )
      .filter((label): label is string => Boolean(label));
    const teacherId = classManagementStore.teachers.find(
      (x) => x.classId === courseClass.id,
    )?.teacherId;
    const schedules = classManagementStore.schedules
      .filter((x) => x.classId === courseClass.id)
      .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
    const activeCount = classManagementStore.enrollments.filter(
      (x) => x.classId === courseClass.id && x.status === "active",
    ).length;
    return {
      id: courseClass.id,
      organizationId: courseClass.organizationId,
      name: courseClass.name,
      code: courseClass.code,
      grade: gradeLabels.join("、"),
      subject: subjectLabels.join("、"),
      schedule: schedules
        .map((x) => `週${weekdayLabels[x.weekday]} ${x.startTime}－${x.endTime}`)
        .join("、"),
      capacity: courseClass.capacity,
      status: courseClass.status,
      teacherName: classReferenceData.teachers.find((x) => x.id === teacherId)?.label ?? "未指派",
      students: activeCount,
      progress: courseClass.progress,
    };
  });
}
function buildEnrollments(): Enrollment[] {
  return classManagementStore.enrollments.map(
    ({ id, organizationId, studentId, classId, status }) => ({
      id,
      organizationId,
      studentId,
      classId,
      status,
    }),
  );
}

export interface StudentRosterRepository {
  listStudents(query: ListStudentsQuery): Promise<StudentListResult>;
}
class MockStudentRosterRepository implements StudentRosterRepository {
  async listStudents(query: ListStudentsQuery) {
    return buildStudentListResult(query, {
      students,
      classes: buildClassRows(),
      enrollments: buildEnrollments(),
    });
  }
}
export const studentRosterRepository: StudentRosterRepository = new MockStudentRosterRepository();
