import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  AssessmentFilters,
  StudentDetailView,
} from "@/features/student-profile/student-profile.types";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { classManagementStore } from "@/server/data/mock/class-management";
import { classRows, students } from "@/server/data/mock/fixtures";
import { studentProfileStore } from "@/server/data/mock/student-profile";
import { classSessionStore } from "@/server/data/mock/class-sessions";
import { buildStudentDetail, type StudentDetailSource } from "./student-detail-core";

export interface StudentDetailRepository {
  get(
    actor: AuthorizationContext,
    studentId: string,
    filters: AssessmentFilters,
  ): StudentDetailView | undefined;
}

const source = (): StudentDetailSource => ({
  students,
  classes: classRows,
  enrollments: classManagementStore.enrollments.map(
    ({ id, organizationId, studentId, classId, status }) => ({
      id,
      organizationId,
      studentId,
      classId,
      status,
    }),
  ),
  profiles: studentProfileStore.profiles,
  guardians: studentProfileStore.guardians,
  assessments: studentProfileStore.assessments,
  results: studentProfileStore.results,
  sessions: [
    ...studentProfileStore.sessions,
    ...classSessionStore.progress.map((entry) => {
      const session = classSessionStore.sessions.find((item) => item.id === entry.classSessionId);
      const member = classSessionStore.members.find((item) => item.id === entry.sessionMemberId);
      const plan = curriculumStore.plans.find((item) => item.id === entry.studyPlanId);
      const version = curriculumStore.versions.find((item) => item.id === plan?.versionId);
      const template = curriculumStore.templates.find((item) => item.id === version?.templateId);
      const learningItem = curriculumStore.learningItems.find(
        (item) => item.id === entry.learningItemId,
      );
      const subject = curriculumStore.subjects.find((item) => item.id === plan?.subjectId)?.name;
      return {
        id: entry.id,
        organizationId: entry.organizationId,
        studentId: entry.studentId,
        classId: session?.classId ?? "",
        date: session?.sessionDate ?? entry.recordedAt.slice(0, 10),
        subject: subject ?? "未設定科目",
        attendance:
          member?.attendanceStatus === "pending"
            ? "present"
            : (member?.attendanceStatus ?? "present"),
        content: `${template?.name ?? "未命名教材"}・${learningItem?.title ?? "未知項目"}`,
        progress:
          entry.statusAfterSession === "completed"
            ? "已完成"
            : entry.statusAfterSession === "in_progress"
              ? "學習中"
              : "尚未開始",
        score: null,
        comment: entry.note ?? "",
        supersedesId: entry.supersedesId,
        correctionReason: entry.correctionReason,
      };
    }),
  ],
  terms: curriculumStore.terms,
});

export const studentDetailRepository: StudentDetailRepository = {
  get: (actor, studentId, filters) => buildStudentDetail(actor, studentId, filters, source()),
};
