import { afterEach, describe, expect, it } from "vitest";
import { classManagementStore, classReferenceData } from "./class-management";
import { students } from "./fixtures";
afterEach(() => classManagementStore.reset());
describe("class management store", () => {
  it("keeps normalized relations valid and stable", () => {
    const classIds = new Set(classManagementStore.classes.map((x) => x.id)),
      studentIds = new Set(students.map((x) => x.id)),
      teacherIds = new Set(classReferenceData.teachers.map((x) => x.id));
    expect(classManagementStore.subjects.every((x) => classIds.has(x.classId))).toBe(true);
    expect(classManagementStore.grades.every((x) => classIds.has(x.classId))).toBe(true);
    expect(classManagementStore.schedules.every((x) => classIds.has(x.classId))).toBe(true);
    expect(
      classManagementStore.teachers.every(
        (x) => classIds.has(x.classId) && teacherIds.has(x.teacherId),
      ),
    ).toBe(true);
    expect(
      classManagementStore.enrollments.every(
        (x) => classIds.has(x.classId) && studentIds.has(x.studentId),
      ),
    ).toBe(true);
    expect(
      new Set(classManagementStore.enrollments.map((x) => `${x.classId}:${x.studentId}`)).size,
    ).toBe(classManagementStore.enrollments.length);
  });
  it("replaces a complete aggregate and reset restores fixtures", () => {
    const original = classManagementStore.snapshot();
    const courseClass = { ...classManagementStore.classes[0], name: "更新班級", revision: 2 };
    classManagementStore.replaceClass(
      courseClass,
      ["math", "physics"],
      ["j2"],
      "teacher",
      [{ weekday: 3, startTime: "18:00", endTime: "20:00", room: "301" }],
      ["stu-1"],
    );
    expect(classManagementStore.classes[0].name).toBe("更新班級");
    expect(
      classManagementStore.enrollments
        .filter((x) => x.classId === "cls-1" && x.status === "active")
        .map((x) => x.studentId),
    ).toEqual(["stu-1"]);
    expect(
      classManagementStore.enrollments.some(
        (x) => x.classId === "cls-1" && x.status === "withdrawn",
      ),
    ).toBe(true);
    classManagementStore.reset();
    expect(classManagementStore.snapshot()).toEqual(original);
  });
});
