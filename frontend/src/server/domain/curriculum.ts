import type {
  LearningStatus,
  PlanStatus,
  TemplateItemType,
  VersionStatus,
} from "@/features/curriculum/curriculum.types";

export interface CurriculumTemplate {
  id: string;
  organizationId: string;
  name: string;
  gradeId: string;
  subjectId: string;
  publisherId: string;
  isArchived: boolean;
  revision?: number;
}
export interface TemplateVersion {
  id: string;
  organizationId: string;
  templateId: string;
  number: number;
  status: VersionStatus;
  revision: number;
}
export interface TemplateItem {
  id: string;
  lineageId: string;
  organizationId: string;
  versionId: string;
  parentId?: string;
  type: TemplateItemType;
  title: string;
  position: number;
}
export interface StudyPlan {
  id: string;
  organizationId: string;
  studentId: string;
  termId: string;
  gradeId: string;
  subjectId: string;
  versionId: string;
  status: PlanStatus;
  replacedByPlanId?: string;
  completedAt?: string;
  replacedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  revision: number;
}
export interface StudentLearningItem {
  id: string;
  organizationId: string;
  planId: string;
  sourceItemId?: string;
  lineageId: string;
  type: TemplateItemType;
  title: string;
  position: number;
  status: LearningStatus;
  isCustom: boolean;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
  completedAt?: string;
  removedAt?: string;
  removedReason?: string;
  carriedFromItemId?: string;
  revision: number;
}
