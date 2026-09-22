import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  AssessmentFilters,
  AssessmentResultView,
  StudentDetailView,
} from "@/features/student-profile/student-profile.types";
import type {
  CourseSessionRecord,
  GuardianRecord,
  StudentAssessment,
  StudentAssessmentResult,
  StudentProfileRecord,
} from "@/server/data/mock/student-profile";
import type { ClassRow, Enrollment, StudentRecord } from "@/server/domain/types";

export interface StudentDetailSource {
  students: StudentRecord[];
  classes: ClassRow[];
  enrollments: Enrollment[];
  profiles: StudentProfileRecord[];
  guardians: GuardianRecord[];
  assessments: StudentAssessment[];
  results: StudentAssessmentResult[];
  sessions: CourseSessionRecord[];
  terms: { id: string; name: string }[];
}

export function canAccessStudent(
  actor: AuthorizationContext,
  studentId: string,
  source: StudentDetailSource,
) {
  const student = source.students.find(
    (row) => row.id === studentId && row.organizationId === actor.organizationId,
  );
  if (!student) return false;
  if (actor.scope.kind === "organization-wide") return true;
  if (actor.scope.kind === "self-student") return actor.scope.studentId === studentId;
  if (actor.scope.kind === "linked-students") return actor.scope.studentIds.includes(studentId);
  if (actor.scope.kind !== "assigned-classes") return false;
  const assignedClassIds = actor.scope.classIds;
  return source.enrollments.some(
    (row) =>
      row.organizationId === actor.organizationId &&
      row.studentId === studentId &&
      row.status === "active" &&
      assignedClassIds.includes(row.classId),
  );
}

const percentage = (score: number, maximum: number) => Math.round((score / maximum) * 100);

export function buildStudentDetail(
  actor: AuthorizationContext,
  studentId: string,
  filters: AssessmentFilters,
  source: StudentDetailSource,
): StudentDetailView | undefined {
  if (!canAccessStudent(actor, studentId, source)) return;
  const student = source.students.find(
    (row) => row.id === studentId && row.organizationId === actor.organizationId,
  )!;
  const profile = source.profiles.find(
    (row) => row.studentId === studentId && row.organizationId === actor.organizationId,
  );
  if (!profile) return;
  const classes = source.enrollments
    .filter(
      (row) =>
        row.studentId === studentId &&
        row.organizationId === actor.organizationId &&
        row.status === "active",
    )
    .map((row) =>
      source.classes.find(
        (courseClass) =>
          courseClass.id === row.classId && courseClass.organizationId === actor.organizationId,
      ),
    )
    .filter(Boolean)
    .map((courseClass) => ({ id: courseClass!.id, name: courseClass!.name }));
  const sessions = source.sessions
    .filter((row) => row.studentId === studentId && row.organizationId === actor.organizationId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      id: row.id,
      date: row.date,
      classId: row.classId,
      className:
        source.classes.find(
          (courseClass) =>
            courseClass.id === row.classId && courseClass.organizationId === actor.organizationId,
        )?.name ?? "未知班級",
      subject: row.subject,
      attendance: row.attendance,
      content: row.content,
      progress: row.progress,
      score: row.score,
      comment: row.comment,
      supersedesId: row.supersedesId,
      correctionReason: row.correctionReason,
    }));
  const allResults = source.results
    .filter((row) => row.studentId === studentId && row.organizationId === actor.organizationId)
    .map((result) => {
      const exam = source.assessments.find(
        (row) => row.id === result.assessmentId && row.organizationId === actor.organizationId,
      );
      return exam
        ? {
            id: result.id,
            assessmentId: exam.id,
            title: exam.title,
            termId: exam.termId,
            subject: exam.subject,
            date: exam.date,
            score: result.score,
            maximumScore: exam.maximumScore,
            percentage: percentage(result.score, exam.maximumScore),
            comment: result.comment,
            revision: result.revision,
            updatedAt: result.updatedAt,
          }
        : null;
    })
    .filter(Boolean) as AssessmentResultView[];
  const filtered = allResults
    .filter(
      (row) =>
        (!filters.termId || row.termId === filters.termId) &&
        (!filters.subject || row.subject === filters.subject),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(1, filters.pageSize);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const average = filtered.length
    ? Math.round(filtered.reduce((sum, row) => sum + row.percentage, 0) / filtered.length)
    : null;
  return {
    profile: {
      id: student.id,
      number: student.number,
      name: student.name,
      gender: student.gender,
      phone: student.phone,
      school: profile.school,
      grade: profile.grade,
      status: student.status,
      revision: profile.revision,
      guardians: source.guardians
        .filter((row) => row.studentId === studentId && row.organizationId === actor.organizationId)
        .map(({ id, name, relationship, phone }) => ({ id, name, relationship, phone })),
      classes,
    },
    sessions,
    assessment: {
      rows,
      exportRows: filtered,
      summary: {
        latestPercentage: filtered[0]?.percentage ?? null,
        averagePercentage: average,
        resultCount: filtered.length,
        trend: [...filtered]
          .reverse()
          .map((row) => ({ label: row.date.slice(5), percentage: row.percentage })),
      },
      terms: source.terms,
      subjects: [
        ...new Set(
          source.assessments
            .filter((row) => row.organizationId === actor.organizationId)
            .map((row) => row.subject),
        ),
      ],
      availableAssessments: source.assessments
        .filter((row) => row.organizationId === actor.organizationId)
        .map(({ id, termId, subject, title, date, maximumScore }) => ({
          id,
          termId,
          subject,
          title,
          date,
          maximumScore,
        })),
      pagination: {
        page,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    },
  };
}
