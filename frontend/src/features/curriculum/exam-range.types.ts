import type { LearningStatus, PlanStatus, TemplateItemType } from "./curriculum.types";

export interface ExamRangeRecord {
  id: string;
  organizationId: string;
  studentId: string;
  name: string;
  examDate: string | null;
  revision: number;
  itemIds: string[];
}
export interface ExamRangeItem {
  id: string;
  planId: string;
  planLabel: string;
  planStatus: PlanStatus;
  title: string;
  type: TemplateItemType;
  parentId?: string;
  status: LearningStatus;
}
export interface ExamRangeWorkspace {
  ranges: ExamRangeRecord[];
  items: ExamRangeItem[];
}
export interface SaveExamRangeCommand {
  studentId: string;
  rangeId: string | null;
  revision: number;
  name: string;
  examDate: string | null;
  itemIds: string[];
}
export interface ExamRangeView extends ExamRangeRecord {
  completed: number;
  total: number;
  percentage: number;
  needsReview: boolean;
  materialLabels: string[];
}
export interface ExamRangeResult {
  ok: boolean;
  message: string;
  isUncertain?: boolean;
}
