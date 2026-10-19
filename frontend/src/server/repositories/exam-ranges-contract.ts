import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ExamRangeWorkspace,
  SaveExamRangeCommand,
} from "@/features/curriculum/exam-range.types";

export interface ExamRangeRepository {
  read(actor: AuthorizationContext, studentId: string): Promise<ExamRangeWorkspace>;
  save(actor: AuthorizationContext, command: SaveExamRangeCommand): Promise<void>;
}
