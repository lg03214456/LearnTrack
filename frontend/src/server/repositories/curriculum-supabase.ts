import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import type {
  CurriculumQuery,
  CurriculumTemplateEditor,
  UpdateTemplateCommand,
} from "@/features/curriculum/curriculum.types";
import { can } from "@/server/authorization/policy";
import { createCurrentUserSupabaseClient } from "@/server/supabase/user-session-client";
import {
  buildCurriculumDetail,
  buildCurriculumDirectory,
  buildStudentStudyPlanPage,
  type CurriculumSource,
} from "./curriculum-core";
import { mapRepositoryError, RepositoryError } from "./repository-error";

export type CurriculumOperation =
  | "create"
  | "publish"
  | "copy"
  | "archive"
  | "addItem"
  | "updateItem"
  | "deleteItem"
  | "moveItem"
  | "reorder"
  | "replacePlan"
  | "adjustItem";

export class SupabaseCurriculumRepository {
  constructor(
    private readonly clientFactory: () => Promise<SupabaseClient> = createCurrentUserSupabaseClient,
  ) {}

  async templateEditor(
    actor: AuthorizationContext,
    templateId: string,
  ): Promise<CurriculumTemplateEditor> {
    if (!can(actor, "curriculum.manage")) throw new RepositoryError("FORBIDDEN");
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("read_curriculum_template_editor", {
      target_organization_id: actor.organizationId,
      target_template_id: templateId,
    });
    if (error) throw mapRepositoryError(error);
    if (
      !data ||
      data.templateId !== templateId ||
      !Number.isInteger(data.revision) ||
      typeof data.canEditClassification !== "boolean" ||
      !["name", "gradeId", "subjectId", "publisherId"].every(
        (key) => typeof data[key] === "string",
      ) ||
      !["grades", "subjects", "publishers"].every((key) => Array.isArray(data.dimensions?.[key]))
    )
      throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
    return data as CurriculumTemplateEditor;
  }

  async updateTemplate(actor: AuthorizationContext, command: UpdateTemplateCommand): Promise<void> {
    if (!can(actor, "curriculum.manage")) throw new RepositoryError("FORBIDDEN");
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("update_curriculum_template", {
      target_organization_id: actor.organizationId,
      command: { ...command },
    });
    if (error) throw mapRepositoryError(error);
    if (data?.id !== command.templateId) throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
  }

  private async source(
    actor: AuthorizationContext,
    versionId?: string,
    studentId?: string,
  ): Promise<CurriculumSource> {
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("read_curriculum_workspace", {
      target_organization_id: actor.organizationId,
      target_version_id: versionId ?? null,
      target_student_id: studentId ?? null,
    });
    if (error) throw mapRepositoryError(error);
    const collections = [
      "grades",
      "subjects",
      "publishers",
      "terms",
      "templates",
      "versions",
      "items",
      "plans",
      "learningItems",
      "students",
      "enrollments",
    ];
    if (!data || !collections.every((key) => Array.isArray(data[key])))
      throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
    for (const key of [
      "templates",
      "versions",
      "items",
      "plans",
      "learningItems",
      "students",
      "enrollments",
    ])
      if (
        data[key].some(
          (row: { organizationId?: string }) => row.organizationId !== actor.organizationId,
        )
      )
        throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
    return data as CurriculumSource;
  }

  async list(actor: AuthorizationContext, query?: CurriculumQuery) {
    if (!can(actor, "curriculum.read")) throw new RepositoryError("FORBIDDEN");
    return buildCurriculumDirectory(actor, await this.source(actor), query);
  }

  async detail(actor: AuthorizationContext, versionId: string) {
    if (!can(actor, "curriculum.read")) throw new RepositoryError("FORBIDDEN");
    return buildCurriculumDetail(actor, await this.source(actor, versionId), versionId);
  }

  async studentPlans(actor: AuthorizationContext, studentId: string) {
    if (!can(actor, "study_plans.read")) throw new RepositoryError("FORBIDDEN");
    return buildStudentStudyPlanPage(
      actor,
      studentId,
      await this.source(actor, undefined, studentId),
    );
  }

  async mutate(
    actor: AuthorizationContext,
    operation: CurriculumOperation,
    command: Record<string, unknown>,
  ): Promise<string | undefined> {
    const permission =
      operation === "replacePlan" || operation === "adjustItem"
        ? "study_plans.manage"
        : "curriculum.manage";
    if (!can(actor, permission)) throw new RepositoryError("FORBIDDEN");
    const client = await this.clientFactory();
    const { data, error } = await client.rpc("mutate_curriculum_workspace", {
      target_organization_id: actor.organizationId,
      operation,
      command,
    });
    if (error) {
      if (["22P02", "22003", "22023"].includes(error.code))
        throw new RepositoryError("INVALID_RELATIONSHIP", { cause: error });
      throw mapRepositoryError(error);
    }
    if (!data || typeof data.id !== "string") throw new RepositoryError("PERSISTENCE_UNAVAILABLE");
    return data.id;
  }
}

export const supabaseCurriculumRepository = new SupabaseCurriculumRepository();
