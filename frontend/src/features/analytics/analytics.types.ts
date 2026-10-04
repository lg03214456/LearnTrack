export interface Analytics {
  averageScore: number;
  completion: number;
  participation: number;
  atRisk: number;
  trend: { month: string; score: number }[];
  bands: { label: string; value: number; color: string }[];
  classes: {
    name: string;
    teacher: string;
    progress: number;
    score: number;
    status: string;
  }[];
}
