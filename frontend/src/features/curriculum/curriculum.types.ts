export type TemplateItemType = "chapter" | "unit" | "material" | "worksheet" | "assessment";
export type VersionStatus = "draft" | "published";
export type PlanStatus = "draft" | "active" | "completed" | "archived";
export type LearningStatus = "pending" | "in_progress" | "completed" | "skipped";
export interface Dimension {
  id: string;
  name: string;
}
export interface CurriculumTemplateView {
  id: string;
  name: string;
  grade: string;
  subject: string;
  publisher: string;
  isArchived: boolean;
  versions: {
    id: string;
    number: number;
    status: VersionStatus;
    revision: number;
    itemCount: number;
  }[];
}
export interface TemplateItemView {
  id: string;
  parentId?: string;
  type: TemplateItemType;
  title: string;
  position: number;
}
export interface CurriculumDetail {
  template: CurriculumTemplateView;
  versionId: string;
  versionNumber: number;
  status: VersionStatus;
  revision: number;
  items: TemplateItemView[];
}
export interface CurriculumDirectory {
  rows: CurriculumTemplateView[];
  dimensions: { grades: Dimension[]; subjects: Dimension[]; publishers: Dimension[] };
  summary: { total: number; published: number; draft: number; archived: number };
}
export interface StudyPlanView {
  id: string;
  term: string;
  subject: string;
  grade: string;
  publisher: string;
  templateName: string;
  version: number;
  status: PlanStatus;
  completed: number;
  total: number;
  percentage: number;
  items: {
    id: string;
    title: string;
    type: TemplateItemType;
    position: number;
    status: LearningStatus;
    isCustom: boolean;
  }[];
}
export interface StudentStudyPlanPage {
  student: { id: string; name: string; number: string };
  plans: StudyPlanView[];
  availableVersions: { id: string; label: string }[];
  terms: Dimension[];
}
export interface CurriculumQuery {
  gradeId?: string;
  subjectId?: string;
  publisherId?: string;
  status?: VersionStatus | "archived";
}
export interface CreateTemplateCommand {
  name: string;
  gradeId: string;
  subjectId: string;
  publisherId: string;
}
export interface AddTemplateItemCommand {
  versionId: string;
  title: string;
  type: TemplateItemType;
  parentId?: string;
  revision: number;
}
export interface DeleteTemplateItemCommand {
  versionId: string;
  itemId: string;
  revision: number;
}
export interface MoveTemplateItemCommand {
  versionId: string;
  itemId: string;
  direction: "up" | "down";
  revision: number;
}
export interface ReorderTemplateItemsCommand {
  versionId: string;
  orderedItemIds: string[];
  revision: number;
}
export interface CreateStudyPlanCommand {
  studentId: string;
  termId: string;
  versionId: string;
}
export interface AdjustLearningItemCommand {
  itemId: string;
  title?: string;
  status?: LearningStatus;
}
export interface CurriculumCommandResult {
  ok: boolean;
  code: "OK" | "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";
  message: string;
}
export interface CurriculumItemFormState extends CurriculumCommandResult {
  values: { title: string; type: TemplateItemType; parentId?: string };
}
