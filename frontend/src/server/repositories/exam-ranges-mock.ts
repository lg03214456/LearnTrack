import "server-only";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  ExamRangeRecord,
  ExamRangeWorkspace,
  SaveExamRangeCommand,
} from "@/features/curriculum/exam-range.types";
import { normalizeExamRangeCommand } from "@/features/curriculum/exam-range-progress";
import { can } from "@/server/authorization/policy";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import { canViewStudent } from "./curriculum-core";
import { RepositoryError } from "./repository-error";
import type { ExamRangeRepository } from "./exam-ranges-contract";

export class MockExamRangeRepository implements ExamRangeRepository {
  private ranges: ExamRangeRecord[] = [];
  private workspace(actor: AuthorizationContext, studentId: string): ExamRangeWorkspace {
    if (!canViewStudent(actor, studentId, { ...curriculumStore, students, enrollments }))
      throw new RepositoryError("FORBIDDEN");
    const plans = curriculumStore.plans.filter(
      (plan) => plan.studentId === studentId && plan.organizationId === actor.organizationId,
    );
    return {
      ranges: structuredClone(
        this.ranges.filter(
          (range) => range.organizationId === actor.organizationId && range.studentId === studentId,
        ),
      ),
      items: plans.flatMap((plan) => {
        const version = curriculumStore.versions.find((row) => row.id === plan.versionId)!;
        const template = curriculumStore.templates.find((row) => row.id === version.templateId)!;
        const items = curriculumStore.learningItems.filter(
          (row) => row.planId === plan.id && row.organizationId === actor.organizationId,
        );
        return items.map((item) => {
          const parentSourceId = curriculumStore.items.find(
            (row) => row.id === item.sourceItemId,
          )?.parentId;
          return {
            id: item.id,
            planId: plan.id,
            planLabel: `${template.name} v${version.number}（${plan.termId}）`,
            planStatus: plan.deletedAt ? ("archived" as const) : plan.status,
            title: item.title,
            type: item.type,
            status: item.status,
            parentId: items.find((row) => parentSourceId && row.sourceItemId === parentSourceId)
              ?.id,
          };
        });
      }),
    };
  }
  async read(actor: AuthorizationContext, studentId: string) {
    if (!can(actor, "study_plans.read")) throw new RepositoryError("FORBIDDEN");
    return this.workspace(actor, studentId);
  }
  async save(actor: AuthorizationContext, input: SaveExamRangeCommand) {
    if (!can(actor, "study_plans.manage")) throw new RepositoryError("FORBIDDEN");
    const workspace = this.workspace(actor, input.studentId);
    let command: SaveExamRangeCommand;
    try {
      command = normalizeExamRangeCommand(input, workspace);
    } catch (error) {
      throw new RepositoryError(
        error instanceof Error && error.message === "CONFLICT"
          ? "CONFLICT"
          : error instanceof Error && error.message === "NOT_FOUND"
            ? "NOT_FOUND"
            : "INVALID_RELATIONSHIP",
      );
    }
    const record: ExamRangeRecord = {
      id: command.rangeId ?? `exam-${crypto.randomUUID()}`,
      organizationId: actor.organizationId,
      studentId: command.studentId,
      name: command.name,
      examDate: command.examDate,
      revision: command.revision + 1,
      itemIds: command.itemIds,
    };
    this.ranges = [...this.ranges.filter((row) => row.id !== record.id), record];
  }
}
