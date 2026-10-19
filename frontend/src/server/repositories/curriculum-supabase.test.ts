import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { SupabaseCurriculumRepository } from "./curriculum-supabase";

const actor = resolveMockIdentity("owner");
const emptySource = {
  grades: [],
  subjects: [],
  publishers: [],
  terms: [],
  templates: [],
  versions: [],
  items: [],
  plans: [],
  learningItems: [],
  students: [],
  enrollments: [],
};
function setup(data: unknown = emptySource, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  const factory = vi.fn(async () => ({ rpc }) as unknown as SupabaseClient);
  return { rpc, factory, repository: new SupabaseCurriculumRepository(factory) };
}

describe("Supabase curriculum adapter", () => {
  it("reads the scoped editable metadata and revision", async () => {
    const editor = {
      templateId: "tpl-db",
      name: "教材",
      gradeId: "g7",
      subjectId: "math",
      publisherId: "custom",
      revision: 1,
      canEditClassification: false,
      dimensions: { grades: [], subjects: [], publishers: [] },
    };
    const { repository, rpc } = setup(editor);
    expect(await repository.templateEditor(actor, "tpl-db")).toEqual(editor);
    expect(rpc).toHaveBeenCalledWith("read_curriculum_template_editor", {
      target_organization_id: actor.organizationId,
      target_template_id: "tpl-db",
    });
  });
  it("writes template metadata using a scoped revision-guarded RPC", async () => {
    const command = {
      templateId: "tpl-db",
      name: "教材",
      gradeId: "g7",
      subjectId: "math",
      publisherId: "custom",
      revision: 1,
    };
    const { repository, rpc } = setup({ id: "tpl-db" });
    await repository.updateTemplate(actor, command);
    expect(rpc).toHaveBeenCalledWith("update_curriculum_template", {
      target_organization_id: actor.organizationId,
      command,
    });
    await expect(
      repository.updateTemplate({ ...actor, permissions: [] }, command),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      repository.templateEditor({ ...actor, permissions: [] }, command.templateId),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects a metadata response for a different template", async () => {
    const { repository } = setup({ templateId: "foreign-template" });
    await expect(repository.templateEditor(actor, "tpl-db")).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
    });
  });
  it("keeps an empty database empty and supplies only server-resolved organization scope", async () => {
    const { repository, rpc } = setup();
    expect(await repository.list(actor)).toMatchObject({ rows: [], summary: { total: 0 } });
    expect(rpc).toHaveBeenCalledWith("read_curriculum_workspace", {
      target_organization_id: actor.organizationId,
      target_version_id: null,
      target_student_id: null,
    });
  });
  it("maps published database templates and their items without Mock seed records", async () => {
    const { repository } = setup({
      ...emptySource,
      grades: [{ id: "g7", name: "國一" }],
      subjects: [{ id: "math", name: "數學" }],
      publishers: [{ id: "custom", name: "自編" }],
      templates: [
        {
          id: "tpl-db",
          organizationId: actor.organizationId,
          name: "資料庫教材",
          gradeId: "g7",
          subjectId: "math",
          publisherId: "custom",
          isArchived: false,
        },
      ],
      versions: [
        {
          id: "ver-db",
          organizationId: actor.organizationId,
          templateId: "tpl-db",
          number: 1,
          status: "published",
          revision: 2,
        },
      ],
      items: [
        {
          id: "item-db",
          organizationId: actor.organizationId,
          versionId: "ver-db",
          lineageId: "item-db",
          type: "unit",
          title: "整數",
          position: 1,
        },
      ],
    });
    expect(await repository.detail(actor, "ver-db")).toMatchObject({
      template: { name: "資料庫教材", grade: "國一", subject: "數學" },
      items: [{ title: "整數" }],
    });
    expect((await repository.list(actor, { subjectId: "english" })).rows).toEqual([]);
    expect(await repository.detail(actor, "missing")).toBeUndefined();
  });
  it("returns scoped student plans, including persisted item revisions", async () => {
    const { repository, rpc } = setup({
      ...emptySource,
      students: [
        {
          id: "stu-db",
          organizationId: actor.organizationId,
          name: "測試學生",
          number: "STU-0001",
        },
      ],
      templates: [
        {
          id: "tpl-db",
          organizationId: actor.organizationId,
          name: "資料庫教材",
          gradeId: "g7",
          subjectId: "math",
          publisherId: "custom",
          isArchived: false,
        },
      ],
      versions: [
        {
          id: "ver-db",
          organizationId: actor.organizationId,
          templateId: "tpl-db",
          number: 1,
          status: "published",
          revision: 2,
        },
      ],
      plans: [
        {
          id: "plan-db",
          organizationId: actor.organizationId,
          studentId: "stu-db",
          termId: "115-1",
          gradeId: "g7",
          subjectId: "math",
          versionId: "ver-db",
          status: "active",
          revision: 1,
        },
      ],
      learningItems: [
        {
          id: "learn-db",
          organizationId: actor.organizationId,
          planId: "plan-db",
          title: "整數",
          lineageId: "item-db",
          type: "unit",
          position: 1,
          status: "completed",
          revision: 3,
          isCustom: false,
        },
      ],
    });
    expect(await repository.studentPlans(actor, "stu-db")).toMatchObject({
      plans: [{ percentage: 100, items: [{ revision: 3 }] }],
    });
    expect(rpc).toHaveBeenCalledWith(
      "read_curriculum_workspace",
      expect.objectContaining({ target_student_id: "stu-db" }),
    );
  });
  it("rejects foreign-tenant projections", async () => {
    const { repository } = setup({
      ...emptySource,
      templates: [{ organizationId: "another-org" }],
    });
    await expect(repository.list(actor)).rejects.toMatchObject({ code: "PERSISTENCE_UNAVAILABLE" });
  });
  it("rejects malformed projections rather than falling back", async () => {
    const { repository } = setup(null);
    await expect(repository.list(actor)).rejects.toMatchObject({ code: "PERSISTENCE_UNAVAILABLE" });
  });
  it("rejects unauthorized reads and writes before connecting", async () => {
    const { repository, factory } = setup();
    const denied = { ...actor, permissions: [] };
    await expect(repository.list(denied)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(repository.studentPlans(denied, "stu-db")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(repository.mutate(denied, "replacePlan", {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(factory).not.toHaveBeenCalled();
  });
  it.each([
    "create",
    "publish",
    "copy",
    "archive",
    "addItem",
    "deleteItem",
    "moveItem",
    "reorder",
    "replacePlan",
    "adjustItem",
  ] as const)("writes %s through one atomic RPC", async (operation) => {
    const { repository, rpc } = setup({ id: "saved-id" });
    const command = { versionId: "ver-db", revision: 2 };
    expect(await repository.mutate(actor, operation, command)).toBe("saved-id");
    expect(rpc).toHaveBeenCalledWith("mutate_curriculum_workspace", {
      target_organization_id: actor.organizationId,
      operation,
      command,
    });
  });
  it.each([
    ["40001", "CONFLICT"],
    ["23514", "INVALID_RELATIONSHIP"],
    ["22P02", "INVALID_RELATIONSHIP"],
    ["42501", "FORBIDDEN"],
    ["P0002", "NOT_FOUND"],
    ["PGRST202", "PERSISTENCE_UNAVAILABLE"],
  ])("maps database %s safely", async (code, expected) => {
    const { repository } = setup(null, { code });
    await expect(repository.mutate(actor, "create", {})).rejects.toMatchObject({ code: expected });
  });
});
