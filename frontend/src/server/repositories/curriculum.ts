import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  CurriculumDetail,
  CurriculumDirectory,
  CurriculumQuery,
  StudentStudyPlanPage,
  CurriculumTemplateEditor,
  UpdateTemplateCommand,
} from "@/features/curriculum/curriculum.types";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { selectDomainRepository } from "./domain-provider";
import { supabaseCurriculumRepository } from "./curriculum-supabase";
import { readMockTemplateEditor, updateMockTemplate } from "./curriculum-template-editor-mock";
import {
  buildCurriculumDetail,
  buildCurriculumDirectory,
  buildStudentStudyPlanPage,
  type CurriculumSource,
} from "./curriculum-core";
export interface CurriculumRepository {
  templateEditor(
    actor: AuthorizationContext,
    templateId: string,
  ): Promise<CurriculumTemplateEditor>;
  updateTemplate(actor: AuthorizationContext, command: UpdateTemplateCommand): Promise<void>;
  list(actor: AuthorizationContext, query?: CurriculumQuery): Promise<CurriculumDirectory>;
  detail(actor: AuthorizationContext, versionId: string): Promise<CurriculumDetail | undefined>;
  studentPlans(
    actor: AuthorizationContext,
    studentId: string,
  ): Promise<StudentStudyPlanPage | undefined>;
}
const getSource = (): CurriculumSource => ({ ...curriculumStore, students, enrollments });
const mockCurriculumRepository: CurriculumRepository = {
  templateEditor: async (actor, templateId) => readMockTemplateEditor(actor, templateId),
  updateTemplate: async (actor, command) => updateMockTemplate(actor, command),
  list: async (actor, query) => buildCurriculumDirectory(actor, getSource(), query),
  detail: async (actor, versionId) => buildCurriculumDetail(actor, getSource(), versionId),
  studentPlans: async (actor, studentId) =>
    buildStudentStudyPlanPage(actor, studentId, getSource()),
};
export const curriculumRepository: CurriculumRepository = {
  templateEditor: (actor, templateId) =>
    selectDomainRepository({
      mock: mockCurriculumRepository,
      supabase: supabaseCurriculumRepository,
    }).templateEditor(actor, templateId),
  updateTemplate: (actor, command) =>
    selectDomainRepository({
      mock: mockCurriculumRepository,
      supabase: supabaseCurriculumRepository,
    }).updateTemplate(actor, command),
  list: (actor, query) =>
    selectDomainRepository({
      mock: mockCurriculumRepository,
      supabase: supabaseCurriculumRepository,
    }).list(actor, query),
  detail: (actor, versionId) =>
    selectDomainRepository({
      mock: mockCurriculumRepository,
      supabase: supabaseCurriculumRepository,
    }).detail(actor, versionId),
  studentPlans: (actor, studentId) =>
    selectDomainRepository({
      mock: mockCurriculumRepository,
      supabase: supabaseCurriculumRepository,
    }).studentPlans(actor, studentId),
};
