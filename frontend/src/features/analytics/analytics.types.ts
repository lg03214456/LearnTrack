export interface Analytics {
  hasData: boolean;
  averageScore: number | null;
  completion: number | null;
  participation: number;
  excellentStudents: number;
  atRisk: number;
  trend: { month: string; score: number }[];
  bands: { label: string; value: number; color: string }[];
  classes: {
    name: string;
    teacher: string;
    progress: number | null;
    score: number | null;
    status: string;
  }[];
}
