import type {
  ListStudentsQuery,
  StudentListResult,
} from "@/features/students/student-roster.types";
import type { ClassRow, Enrollment, StudentRecord } from "@/server/domain/types";

export function buildStudentListResult(
  query: ListStudentsQuery,
  source: { students: StudentRecord[]; classes: ClassRow[]; enrollments: Enrollment[] },
): StudentListResult {
  const organizationStudents = source.students.filter(
    (student) =>
      student.organizationId === query.organizationId &&
      (!query.accessibleStudentIds || query.accessibleStudentIds.includes(student.id)),
  );
  const organizationClasses = source.classes.filter(
    (courseClass) =>
      courseClass.organizationId === query.organizationId &&
      (!query.accessibleClassIds || query.accessibleClassIds.includes(courseClass.id)),
  );
  const organizationEnrollments = source.enrollments.filter(
    (enrollment) =>
      enrollment.organizationId === query.organizationId &&
      enrollment.status === "active" &&
      (!query.accessibleClassIds || query.accessibleClassIds.includes(enrollment.classId)),
  );
  const selectedClass = query.classId
    ? organizationClasses.find((courseClass) => courseClass.id === query.classId)
    : undefined;

  if (query.classId && !selectedClass) {
    return {
      state: "unavailable-class",
      rows: [],
      classOptions: organizationClasses.map(({ id, name }) => ({ id, name })),
      summary: {
        totalStudents: 0,
        activeStudents: 0,
        leaveStudents: 0,
        archivedStudents: 0,
        contextTotal: 0,
      },
      pagination: { page: 1, pageSize: query.pageSize, total: 0, totalPages: 0 },
    };
  }

  const enrolledStudentIds = selectedClass
    ? new Set(
        organizationEnrollments
          .filter((enrollment) => enrollment.classId === selectedClass.id)
          .map((enrollment) => enrollment.studentId),
      )
    : undefined;
  const normalizedSearch = query.search?.trim().toLocaleLowerCase("zh-Hant") ?? "";
  const scopedStudentIds = query.accessibleClassIds
    ? new Set(organizationEnrollments.map((x) => x.studentId))
    : undefined;
  const contextStudents = organizationStudents.filter(
    (student) =>
      (!scopedStudentIds || scopedStudentIds.has(student.id)) &&
      (!enrolledStudentIds || enrolledStudentIds.has(student.id)),
  );
  const visibleByLifecycle = contextStudents.filter((student) =>
    query.status === "archived" ? student.status === "archived" : student.status !== "archived",
  );
  const filteredStudents = visibleByLifecycle.filter((student) => {
    const matchesSearch =
      !normalizedSearch ||
      student.name.toLocaleLowerCase("zh-Hant").includes(normalizedSearch) ||
      student.number.toLowerCase().includes(normalizedSearch);
    return matchesSearch && (!query.status || student.status === query.status);
  });
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
  const pageSize = Number.isInteger(query.pageSize) && query.pageSize > 0 ? query.pageSize : 20;
  const rows = filteredStudents.slice((page - 1) * pageSize, page * pageSize).map((student) => ({
    ...student,
    revision: student.revision ?? 1,
    classes: organizationEnrollments
      .filter((enrollment) => enrollment.studentId === student.id)
      .map((enrollment) => {
        const courseClass = organizationClasses.find(
          (candidate) => candidate.id === enrollment.classId,
        )!;
        return { classId: courseClass.id, className: courseClass.name };
      }),
  }));

  return {
    state: "ready",
    rows,
    classOptions: organizationClasses.map(({ id, name }) => ({ id, name })),
    selectedClass: selectedClass
      ? { id: selectedClass.id, name: selectedClass.name, capacity: selectedClass.capacity }
      : undefined,
    summary: {
      totalStudents: contextStudents.length,
      activeStudents: contextStudents.filter((student) => student.status === "active").length,
      leaveStudents: contextStudents.filter((student) => student.status === "leave").length,
      archivedStudents: contextStudents.filter((student) => student.status === "archived").length,
      contextTotal: selectedClass ? selectedClass.capacity : organizationClasses.length,
    },
    pagination: {
      page,
      pageSize,
      total: filteredStudents.length,
      totalPages: Math.ceil(filteredStudents.length / pageSize),
    },
  };
}
