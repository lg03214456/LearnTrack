import { beforeEach, describe, expect, it, vi } from "vitest";
import { addTemplateItemStateAction, reorderTemplateItemsAction } from "./curriculum-actions";
import { addTemplateItem, reorderTemplateItems } from "@/server/services/curriculum-service";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({
  getAuthorizationContext: vi.fn(async () => ({ profileId: "owner" })),
}));
vi.mock("@/server/services/curriculum-service", () => ({
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
}));

describe("curriculum item actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("parses item type, title, version, and revision before invoking service", async () => {
    vi.mocked(addTemplateItem).mockReturnValue({
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
    vi.mocked(reorderTemplateItems).mockReturnValue({
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
