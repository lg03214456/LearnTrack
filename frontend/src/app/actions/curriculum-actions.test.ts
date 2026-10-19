import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTemplateItemStateAction,
  reorderTemplateItemsAction,
  updateTemplateStateAction,
  updateTemplateItemStateAction,
  archiveTemplateAction,
} from "./curriculum-actions";
import {
  addTemplateItem,
  reorderTemplateItems,
  updateTemplate,
  updateTemplateItem,
  archiveTemplate,
} from "@/server/services/curriculum-persistence-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({
  getAuthorizationContext: vi.fn(async () => ({ profileId: "owner" })),
}));
vi.mock("@/server/services/curriculum-persistence-service", () => ({
  addTemplateItem: vi.fn(),
  adjustLearningItem: vi.fn(),
  archiveTemplate: vi.fn(),
  copyVersion: vi.fn(),
  createAndActivatePlan: vi.fn(),
  createTemplate: vi.fn(),
  deleteTemplateItem: vi.fn(),
  moveTemplateItem: vi.fn(),
  publishVersion: vi.fn(),
  reorderTemplateItems: vi.fn(),
  updateTemplate: vi.fn(),
  updateTemplateItem: vi.fn(),
}));

describe("curriculum item actions", () => {
  it("soft deletes through the configured service and invalidates preserved views", async () => {
    vi.mocked(archiveTemplate).mockResolvedValue({ ok: true, code: "OK", message: "已封存" });
    const data = new FormData();
    data.set("templateId", "tpl");
    await archiveTemplateAction(data);
    expect(archiveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "owner" }),
      "tpl",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/curriculum/templates/[versionId]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/students/[studentId]", "page");
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining("/curriculum/templates?"));
  });
  it("normalizes metadata and refreshes only on successful save", async () => {
    vi.mocked(updateTemplate).mockResolvedValue({ ok: true, code: "OK", message: "已儲存" });
    const data = new FormData();
    for (const [key, value] of Object.entries({
      templateId: "tpl",
      revision: "3",
      name: "教材",
      gradeId: "g7",
      subjectId: "math",
      publisherId: "custom",
    }))
      data.set(key, value);
    const result = await updateTemplateStateAction({ ok: false, code: "OK", message: "" }, data);
    expect(updateTemplate).toHaveBeenCalledWith(expect.objectContaining({ profileId: "owner" }), {
      templateId: "tpl",
      revision: 3,
      name: "教材",
      gradeId: "g7",
      subjectId: "math",
      publisherId: "custom",
    });
    expect(result.ok).toBe(true);
  });
  it("passes item edits and revisions to the configured service without redirecting on conflict", async () => {
    vi.mocked(updateTemplateItem).mockResolvedValue({
      ok: false,
      code: "CONFLICT",
      message: "版本已更新",
    });
    const data = new FormData();
    for (const [key, value] of Object.entries({
      versionId: "ver",
      itemId: "item",
      revision: "4",
      title: "考卷",
      type: "assessment",
      parentId: "unit",
    }))
      data.set(key, value);
    const result = await updateTemplateItemStateAction(
      { ok: false, code: "OK", message: "" },
      data,
    );
    expect(updateTemplateItem).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "owner" }),
      {
        versionId: "ver",
        itemId: "item",
        revision: 4,
        title: "考卷",
        type: "assessment",
        parentId: "unit",
      },
    );
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });
  beforeEach(() => vi.clearAllMocks());
  it("parses item type, title, version, and revision before invoking service", async () => {
    vi.mocked(addTemplateItem).mockResolvedValue({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "名稱無效",
    });
    const form = new FormData();
    form.set("versionId", "ver-math-2");
    form.set("revision", "4");
    form.set("type", "worksheet");
    form.set("title", "  機率講義  ");
    const result = await addTemplateItemStateAction(
      { ok: false, code: "OK", message: "", values: { title: "", type: "unit" } },
      form,
    );
    expect(addTemplateItem).toHaveBeenCalledWith(expect.objectContaining({ profileId: "owner" }), {
      versionId: "ver-math-2",
      revision: 4,
      type: "worksheet",
      title: "  機率講義  ",
    });
    expect(result).toMatchObject({
      ok: false,
      message: "名稱無效",
      values: { type: "worksheet", title: "  機率講義  " },
    });
  });
  it("normalizes a complete ordered id command before invoking service", async () => {
    vi.mocked(reorderTemplateItems).mockResolvedValue({
      ok: true,
      code: "OK",
      message: "教材順序已更新",
    });
    const result = await reorderTemplateItemsAction({
      versionId: "ver-math-2",
      orderedItemIds: ["b", "a"],
      revision: 3,
    });
    expect(reorderTemplateItems).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "owner" }),
      { versionId: "ver-math-2", orderedItemIds: ["b", "a"], revision: 3 },
    );
    expect(result.ok).toBe(true);
  });
});
