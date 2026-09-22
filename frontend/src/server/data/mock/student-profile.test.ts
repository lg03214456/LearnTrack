import { describe, expect, it } from "vitest";
import { students } from "./fixtures";
import { studentProfileStore } from "./student-profile";
describe("student profile mock relationships", () => {
  it("resolves students, assessments, and bounded scores", () => {
    for (const profile of studentProfileStore.profiles)
      expect(
        students.some(
          (x) => x.id === profile.studentId && x.organizationId === profile.organizationId,
        ),
      ).toBe(true);
    for (const guardian of studentProfileStore.guardians)
      expect(
        students.some(
          (x) => x.id === guardian.studentId && x.organizationId === guardian.organizationId,
        ),
      ).toBe(true);
    for (const result of studentProfileStore.results) {
      const exam = studentProfileStore.assessments.find(
        (x) => x.id === result.assessmentId && x.organizationId === result.organizationId,
      );
      expect(exam).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(exam!.maximumScore);
    }
  });
});
