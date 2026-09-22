import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { curriculumStore } from "@/server/data/mock/curriculum";
import {
  addTemplateItem,
  archiveTemplate,
  copyVersion,
  createAndActivatePlan,
  deleteTemplateItem,
  moveTemplateItem,
  publishVersion,
  reorderTemplateItems,
  updateTemplateItem,
} from "./curriculum-service";

const owner = resolveMockIdentity("owner");
describe("curriculum service", () => {
  beforeEach(() => curriculumStore.reset());
  it("publishes content, rejects later edits, and creates an independent draft", () => {
    const published = publishVersion(owner, "ver-math-2");
    expect(published.ok).toBe(true);
    expect(
      addTemplateItem(owner, {
        versionId: "ver-math-2",
        title: "不應寫入",
        type: "unit",
        revision: 2,
      }),
    ).toMatchObject({ ok: false, code: "CONFLICT" });
    const copied = copyVersion(owner, "ver-math-2");
    expect(copied.ok).toBe(true);
    const draft = curriculumStore.versions.find((x) => x.id === copied.message);
    expect(draft?.status).toBe("draft");
    expect(curriculumStore.items.filter((x) => x.versionId === draft?.id)).toHaveLength(
      curriculumStore.items.filter((x) => x.versionId === "ver-math-2").length,
    );
  });
  it("keeps archived assignments readable but unavailable to new plans", () => {
    expect(archiveTemplate(owner, "tpl-eng").ok).toBe(true);
    expect(curriculumStore.plans.find((x) => x.id === "plan-2")).toBeDefined();
    expect(
      createAndActivatePlan(owner, { studentId: "stu-2", termId: "115-2", versionId: "ver-eng-1" }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });
  it("materializes a snapshot that is independent from later source changes", () => {
    const result = createAndActivatePlan(owner, {
      studentId: "stu-2",
      termId: "115-2",
      versionId: "ver-eng-1",
    });
    expect(result.ok).toBe(true);
    const plan = curriculumStore.plans.at(-1)!;
    const snapshot = curriculumStore.learningItems.filter((x) => x.planId === plan.id);
    expect(snapshot.map((x) => x.sourceItemId)).toEqual(
      curriculumStore.items.filter((x) => x.versionId === "ver-eng-1").map((x) => x.id),
    );
    const sourceItem = curriculumStore.items.find((x) => x.versionId === "ver-eng-1")!;
    curriculumStore.updateItems([{ ...sourceItem, title: "來源後續修正" }]);
    expect(curriculumStore.learningItems.find((x) => x.id === snapshot[0].id)?.title).not.toBe(
      "來源後續修正",
    );
  });
  it("edits and reorders only drafts with optimistic revision checks", () => {
    const edited = updateTemplateItem(owner, {
      versionId: "ver-math-2",
      itemId: "m2-ch-0",
      title: "乘法公式練習",
      type: "worksheet",
      parentId: "m2-unit-0",
      revision: 1,
    });
    expect(edited.ok).toBe(true);
    expect(
      updateTemplateItem(owner, {
        versionId: "ver-math-2",
        itemId: "m2-ch-0",
        title: "過期寫入",
        type: "unit",
        revision: 1,
      }),
    ).toMatchObject({ ok: false, code: "CONFLICT" });
    const ids = curriculumStore.items
      .filter((x) => x.versionId === "ver-math-2")
      .sort((a, b) => a.position - b.position)
      .map((x) => x.id)
      .reverse();
    expect(
      reorderTemplateItems(owner, { versionId: "ver-math-2", orderedItemIds: ids, revision: 2 }).ok,
    ).toBe(true);
    expect(
      curriculumStore.items
        .filter((x) => x.versionId === "ver-math-2")
        .sort((a, b) => a.position - b.position)
        .map((x) => x.id),
    ).toEqual(ids);
  });
  it("rejects invalid parents, cycles, depth, and incomplete ordering", () => {
    expect(
      updateTemplateItem(owner, {
        versionId: "ver-math-2",
        itemId: "m2-unit-0",
        title: "循環",
        type: "chapter",
        parentId: "m2-ch-0",
        revision: 1,
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(
      updateTemplateItem(owner, {
        versionId: "ver-math-2",
        itemId: "m2-unit-0",
        title: "跨版",
        type: "unit",
        parentId: "m1-ch-0",
        revision: 1,
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(
      reorderTemplateItems(owner, {
        versionId: "ver-math-2",
        orderedItemIds: ["m2-ch-0"],
        revision: 1,
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });
  it("adds supported item types and rejects invalid or stale input without mutation", () => {
    const before = structuredClone(curriculumStore.items);
    expect(
      addTemplateItem(owner, { versionId: "ver-math-2", title: "", type: "chapter", revision: 1 })
        .code,
    ).toBe("VALIDATION_ERROR");
    expect(
      addTemplateItem(owner, {
        versionId: "ver-math-2",
        title: "測試",
        type: "invalid" as "unit",
        revision: 1,
      }).code,
    ).toBe("VALIDATION_ERROR");
    expect(curriculumStore.items).toEqual(before);
    expect(
      addTemplateItem(owner, {
        versionId: "ver-math-2",
        title: "機率",
        type: "worksheet",
        revision: 1,
      }).ok,
    ).toBe(true);
    expect(curriculumStore.items.find((x) => x.title === "機率")).toMatchObject({
      type: "worksheet",
      position: 6,
    });
  });
  it("deletes a draft item, compacts order, and rejects stale or published writes", () => {
    expect(
      deleteTemplateItem(owner, { versionId: "ver-math-2", itemId: "m2-unit-0", revision: 1 }).ok,
    ).toBe(true);
    const remaining = curriculumStore.items
      .filter((x) => x.versionId === "ver-math-2")
      .sort((a, b) => a.position - b.position);
    expect(remaining.map((x) => x.id)).not.toContain("m2-ch-0");
    expect(remaining.map((x) => x.id)).not.toContain("m2-unit-0");
    expect(remaining.map((x) => x.position)).toEqual([0, 1, 2, 3]);
    expect(
      deleteTemplateItem(owner, { versionId: "ver-math-2", itemId: "m2-ch-1", revision: 1 }).code,
    ).toBe("CONFLICT");
    expect(
      deleteTemplateItem(owner, { versionId: "ver-math-1", itemId: "m1-ch-0", revision: 1 }).code,
    ).toBe("CONFLICT");
  });
  it("moves adjacent items and enforces boundaries, permission, and revision", () => {
    expect(
      moveTemplateItem(owner, {
        versionId: "ver-math-2",
        itemId: "m2-ch-0",
        direction: "up",
        revision: 1,
      }).ok,
    ).toBe(true);
    expect(
      curriculumStore.items
        .filter((x) => x.versionId === "ver-math-2")
        .sort((a, b) => a.position - b.position)
        .slice(0, 2)
        .map((x) => x.id),
    ).toEqual(["m2-ch-0", "m2-unit-0"]);
    expect(
      moveTemplateItem(owner, {
        versionId: "ver-math-2",
        itemId: "m2-ch-0",
        direction: "up",
        revision: 2,
      }).code,
    ).toBe("VALIDATION_ERROR");
    expect(
      moveTemplateItem(owner, {
        versionId: "ver-math-2",
        itemId: "m2-unit-0",
        direction: "down",
        revision: 1,
      }).code,
    ).toBe("CONFLICT");
    expect(
      moveTemplateItem(resolveMockIdentity("limited"), {
        versionId: "ver-math-2",
        itemId: "m2-ch-0",
        direction: "down",
        revision: 2,
      }).code,
    ).toBe("FORBIDDEN");
  });
  it("validates complete-order sorting against permission, status, exact ids, and revision", () => {
    const ids = curriculumStore.items
      .filter((x) => x.versionId === "ver-math-2")
      .sort((a, b) => a.position - b.position)
      .map((x) => x.id);
    const before = structuredClone(curriculumStore.items);
    expect(
      reorderTemplateItems(resolveMockIdentity("limited"), {
        versionId: "ver-math-2",
        orderedItemIds: [...ids].reverse(),
        revision: 1,
      }).code,
    ).toBe("FORBIDDEN");
    expect(
      reorderTemplateItems(owner, {
        versionId: "ver-math-1",
        orderedItemIds: curriculumStore.items
          .filter((x) => x.versionId === "ver-math-1")
          .map((x) => x.id),
        revision: 1,
      }).code,
    ).toBe("CONFLICT");
    expect(
      reorderTemplateItems(owner, {
        versionId: "ver-math-2",
        orderedItemIds: [ids[0], ids[0], ...ids.slice(2)],
        revision: 1,
      }).code,
    ).toBe("VALIDATION_ERROR");
    expect(
      reorderTemplateItems(owner, {
        versionId: "ver-math-2",
        orderedItemIds: [...ids].reverse(),
        revision: 99,
      }).code,
    ).toBe("CONFLICT");
    expect(curriculumStore.items).toEqual(before);
  });
});
