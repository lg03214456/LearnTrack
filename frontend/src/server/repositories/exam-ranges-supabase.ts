import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ExamRangeWorkspace,
  SaveExamRangeCommand,
} from "@/features/curriculum/exam-range.types";
import { can } from "@/server/authorization/policy";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import { mapRepositoryError, RepositoryError } from "./repository-error";
import type { ExamRangeRepository } from "./exam-ranges-contract";

export class SupabaseExamRangeRepository implements ExamRangeRepository {
  constructor(
    private readonly clientFactory: () => Promise<SupabaseClient> = createCurrentUserSupabaseClient,
  ) {}
  private async request(name: string, args: Record<string, unknown>) {
    try {
      const { data, error } = await (await this.clientFactory()).rpc(name, args);
      if (error) {
        if (["22007", "22008", "22P02"].includes(error.code))
          throw new RepositoryError("INVALID_RELATIONSHIP", { cause: error });
        throw mapRepositoryError(error);
      }
      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError("PERSISTENCE_UNAVAILABLE", { cause: error });
    }
  }
  async read(actor: AuthorizationContext, studentId: string): Promise<ExamRangeWorkspace> {
    if (!can(actor, "study_plans.read")) throw new RepositoryError("FORBIDDEN");
    const data = await this.request("read_student_exam_ranges", {
      target_organization_id: actor.organizationId,
      target_student_id: studentId,
    });
    if (
      !data ||
      data.organizationId !== actor.organizationId ||
      data.studentId !== studentId ||
      !Array.isArray(data.ranges) ||
      !Array.isArray(data.items) ||
      data.ranges.some(
        (range: ExamRangeWorkspace["ranges"][number]) =>
          !range ||
          range.organizationId !== actor.organizationId ||
          range.studentId !== studentId ||
          typeof range.id !== "string" ||
          typeof range.name !== "string" ||
          !Number.isInteger(range.revision) ||
          range.revision < 1 ||
          !(range.examDate === null || typeof range.examDate === "string") ||
          !Array.isArray(range.itemIds) ||
          range.itemIds.some((id) => typeof id !== "string"),
      ) ||
      data.items.some(
        (item: ExamRangeWorkspace["items"][number]) =>
          !item ||
          ![item.id, item.planId, item.planLabel, item.title].every(
            (value) => typeof value === "string",
          ) ||
          !["chapter", "unit", "material", "worksheet", "assessment"].includes(item.type) ||
          !["pending", "in_progress", "completed", "skipped", "removed"].includes(item.status) ||
          !["draft", "active", "completed", "replaced", "archived"].includes(item.planStatus) ||
          !(item.parentId === undefined || typeof item.parentId === "string"),
      )
    )
      throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
    return data as ExamRangeWorkspace;
  }
  async save(actor: AuthorizationContext, command: SaveExamRangeCommand) {
    if (!can(actor, "study_plans.manage")) throw new RepositoryError("FORBIDDEN");
    const data = await this.request("save_student_exam_range", {
      target_organization_id: actor.organizationId,
      command: { ...command },
    });
    if (!data || typeof data.id !== "string") throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
  }
}
