import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { readMockTemplateEditor, updateMockTemplate } from "./curriculum-template-editor-mock";

describe("curriculum metadata editing", () => {
  const owner = resolveMockIdentity("owner");
  beforeEach(() => curriculumStore.reset());
  it("renames metadata without changing student snapshots or published items", () => {
    const editor = readMockTemplateEditor(owner, "tpl-math");
    expect(editor.canEditClassification).toBe(false);
    const items = structuredClone(curriculumStore.items);
    const plans = structuredClone(curriculumStore.plans);
    updateMockTemplate(owner, { ...editor, name: "新版教材名稱", publisherId: "custom" });
    expect(readMockTemplateEditor(owner, editor.templateId)).toMatchObject({
      name: "新版教材名稱",
      revision: 2,
    });
    expect(curriculumStore.items).toEqual(items);
    expect(curriculumStore.plans).toEqual(plans);
    expect(() => updateMockTemplate(owner, editor)).toThrow("CONFLICT");
  });
  it("rejects changing classification of a published template", () => {
    const editor = readMockTemplateEditor(owner, "tpl-math");
    expect(() =>
      updateMockTemplate(owner, { ...editor, gradeId: editor.gradeId === "g8" ? "g7" : "g8" }),
    ).toThrow("CONFLICT");
  });
  it("rejects unauthorized and foreign organization access", () => {
    expect(() => readMockTemplateEditor({ ...owner, permissions: [] }, "tpl-math")).toThrow(
      "FORBIDDEN",
    );
    expect(() => readMockTemplateEditor({ ...owner, organizationId: "other" }, "tpl-math")).toThrow(
      "NOT_FOUND",
    );
  });
  it("rejects duplicate names and archived templates", () => {
    const editor = readMockTemplateEditor(owner, "tpl-math");
    const other = curriculumStore.templates.find((row) => row.id === "tpl-eng")!;
    expect(() => updateMockTemplate(owner, { ...editor, name: other.name })).toThrow("CONFLICT");
    const template = curriculumStore.templates.find((row) => row.id === editor.templateId)!;
    curriculumStore.updateTemplate({ ...template, isArchived: true });
    expect(() => updateMockTemplate(owner, editor)).toThrow("NOT_FOUND");
  });
});
