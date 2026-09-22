import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classManagementStore, classReferenceData } from "@/server/data/mock/class-management";
import { classSessionStore } from "@/server/data/mock/class-sessions";
import { curriculumStore } from "@/server/data/mock/curriculum";
import { students } from "@/server/data/mock/fixtures";
import { buildClassDailyWorkspace } from "./class-session-core";

const source = () => ({
  courseClass: classManagementStore.classes[0],
  teacherName: classReferenceData.teachers[0].label,
  scheduleLabel: "18:30–20:30",
  session: classSessionStore.sessions[0],
  members: classSessionStore.members,
  progress: classSessionStore.progress,
  students,
  enrollments: classManagementStore.enrollments,
  plans: curriculumStore.plans,
  learningItems: curriculumStore.learningItems,
  versions: curriculumStore.versions,
  templates: curriculumStore.templates,
  subjects: curriculumStore.subjects,
  publishers: curriculumStore.publishers,
});

describe("class daily workspace composition", () => {
  beforeEach(() => {
    classManagementStore.reset();
    classSessionStore.reset();
    curriculumStore.reset();
  });

  it("resolves each member curriculum independently and identifies missing plans", () => {
    const view = buildClassDailyWorkspace(resolveMockIdentity("owner"), source())!;
    expect(view.members.find((member) => member.studentId === "stu-1")?.plans).toHaveLength(2);
    expect(view.members.find((member) => member.studentId === "stu-2")?.plans).toHaveLength(1);
    expect(view.members.find((member) => member.studentId === "stu-3")?.needsPlanSetup).toBe(true);
  });

  it("does not expose an unassigned class to a teacher", () => {
    const other = source();
    other.courseClass = classManagementStore.classes[1];
    other.session = { ...classSessionStore.sessions[0], classId: "cls-2" };
    expect(buildClassDailyWorkspace(resolveMockIdentity("teacher"), other)).toBeUndefined();
  });
});
