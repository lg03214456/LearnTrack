import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  CurriculumDetail,
  CurriculumDirectory,
  CurriculumQuery,
  StudentStudyPlanPage,
} from "@/features/curriculum/curriculum.types";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import {
  buildCurriculumDetail,
  buildCurriculumDirectory,
  buildStudentStudyPlanPage,
  type CurriculumSource,
} from "./curriculum-core";
export interface CurriculumRepository {
  list(actor: AuthorizationContext, query?: CurriculumQuery): CurriculumDirectory;
  detail(actor: AuthorizationContext, versionId: string): CurriculumDetail | undefined;
  studentPlans(actor: AuthorizationContext, studentId: string): StudentStudyPlanPage | undefined;
}
const getSource = (): CurriculumSource => ({ ...curriculumStore, students, enrollments });
export const curriculumRepository: CurriculumRepository = {
  list: (actor, query) => buildCurriculumDirectory(actor, getSource(), query),
  detail: (actor, versionId) => buildCurriculumDetail(actor, getSource(), versionId),
  studentPlans: (actor, studentId) => buildStudentStudyPlanPage(actor, studentId, getSource()),
};
