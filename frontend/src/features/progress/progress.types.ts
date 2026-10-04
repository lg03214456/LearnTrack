export type ProgressStatus = "ahead" | "normal" | "behind";

export interface ProgressRow {
  studentId: string;
  name: string;
  number: string;
  className: string;
  progress: number;
  completed: number;
  total: number;
  score: number;
  status: ProgressStatus;
  recent: string;
}
