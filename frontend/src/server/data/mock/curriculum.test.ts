import { beforeEach, describe, expect, it } from "vitest";
import { curriculumStore } from "./curriculum";
describe("curriculum mock relationships", () => {
  beforeEach(() => curriculumStore.reset());
  it("resolves normalized relationships", () => {
    for (const t of curriculumStore.templates) {
      expect(curriculumStore.grades.some((x) => x.id === t.gradeId)).toBe(true);
      expect(curriculumStore.subjects.some((x) => x.id === t.subjectId)).toBe(true);
      expect(curriculumStore.publishers.some((x) => x.id === t.publisherId)).toBe(true);
    }
    for (const v of curriculumStore.versions)
      expect(curriculumStore.templates.some((x) => x.id === v.templateId)).toBe(true);
    for (const i of curriculumStore.items) {
      expect(curriculumStore.versions.some((x) => x.id === i.versionId)).toBe(true);
      if (i.parentId)
        expect(
          curriculumStore.items.some((x) => x.id === i.parentId && x.versionId === i.versionId),
        ).toBe(true);
    }
    for (const p of curriculumStore.plans) {
      expect(curriculumStore.versions.some((x) => x.id === p.versionId)).toBe(true);
      expect(curriculumStore.terms.some((x) => x.id === p.termId)).toBe(true);
    }
    for (const i of curriculumStore.learningItems)
      expect(curriculumStore.plans.some((x) => x.id === i.planId)).toBe(true);
  });
  it("resets mutations", () => {
    const count = curriculumStore.templates.length;
    curriculumStore.addTemplate({
      id: "temporary",
      organizationId: "org-1",
      name: "temporary",
      gradeId: "g7",
      subjectId: "math",
      publisherId: "custom",
      isArchived: false,
    });
    expect(curriculumStore.templates).toHaveLength(count + 1);
    curriculumStore.reset();
    expect(curriculumStore.templates).toHaveLength(count);
  });
});
