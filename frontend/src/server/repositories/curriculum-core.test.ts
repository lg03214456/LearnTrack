import { describe, expect, it } from "vitest";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { ORG, students } from "@/server/data/mock/fixtures";
import { enrollments } from "@/server/data/mock/relations";
import {
  buildCurriculumDetail,
  buildCurriculumDirectory,
  buildStudentStudyPlanPage,
} from "./curriculum-core";

const owner: AuthorizationContext = {
  actorType: "organization",
  profileId: "owner",
  membershipId: "m",
  organizationId: ORG,
  name: "Owner",
  email: "o@x",
  roleId: "owner",
  roleName: "Owner",
  status: "active",
  permissions: ["curriculum.read", "study_plans.read"],
  scope: { kind: "organization-wide" },
};
const source = () => ({ ...curriculumStore, students, enrollments });
describe("curriculum view-model builders", () => {
  it("isolates organizations and orders content", () => {
    expect(
      buildCurriculumDirectory({ ...owner, organizationId: "other" }, source(), {}).rows,
    ).toHaveLength(0);
    const versions = buildCurriculumDirectory(owner, source(), {}).rows[0].versions;
    expect(versions[0].number).toBeGreaterThanOrEqual(versions.at(-1)!.number);
    expect(
      buildCurriculumDetail(owner, source(), "ver-math-1")!.items.map((x) => x.position),
    ).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("derives progress and enforces assigned classes", () => {
    const teacher = { ...owner, scope: { kind: "assigned-classes" as const, classIds: ["cls-1"] } };
    const page = buildStudentStudyPlanPage(teacher, "stu-1", source())!;
    expect(page.plans[0].completed).toBe(2);
    expect(page.plans[0].percentage).toBe(33);
    expect(
      buildStudentStudyPlanPage(
        { ...teacher, scope: { kind: "assigned-classes", classIds: ["cls-3"] } },
        "stu-1",
        source(),
      ),
    ).toBeUndefined();
  });
  it("derives completion from status and never from the optional note", () => {
    const before = buildStudentStudyPlanPage(owner, "stu-1", source())!;
    const item = curriculumStore.learningItems.find((row) => row.planId === "plan-1")!;
    const originalNote = item.note;
    item.note = "今天看到 p.42，但狀態沒有改變";
    const after = buildStudentStudyPlanPage(owner, "stu-1", source())!;
    item.note = originalNote;

    expect(after.plans[0].completed).toBe(before.plans[0].completed);
    expect(after.plans[0].percentage).toBe(before.plans[0].percentage);
  });
});
