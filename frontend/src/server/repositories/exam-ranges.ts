import "server-only";
import { selectDomainRepository } from "./domain-provider";
import { MockExamRangeRepository } from "./exam-ranges-mock";
import { SupabaseExamRangeRepository } from "./exam-ranges-supabase";
import type { ExamRangeRepository } from "./exam-ranges-contract";

const providers = {
  mock: new MockExamRangeRepository(),
  supabase: new SupabaseExamRangeRepository(),
};
export const examRangeRepository: ExamRangeRepository = {
  read: (actor, studentId) => selectDomainRepository(providers).read(actor, studentId),
  save: (actor, command) => selectDomainRepository(providers).save(actor, command),
};
