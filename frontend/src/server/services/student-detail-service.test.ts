import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { studentProfileStore } from "@/server/data/mock/student-profile";
import {
  correctAssessmentResult,
  recordAssessmentResult,
  updateStudentProfile,
} from "./student-detail-service";

describe("student detail commands", () => {
  beforeEach(() => studentProfileStore.reset());

  it("updates profile and guardian with an optimistic revision", () => {
    const outcome = updateStudentProfile(resolveMockIdentity("teacher"), {
      studentId: "stu-1",
      phone: "0900",
      school: "新學校",
      grade: "國三",
      guardianId: "guardian-1",
      guardianName: "新家長",
      guardianPhone: "0911",
      revision: 1,
    });
    expect(outcome.ok).toBe(true);
    expect(studentProfileStore.profiles.find((x) => x.studentId === "stu-1")).toMatchObject({
      school: "新學校",
      grade: "國三",
      revision: 2,
    });
    expect(studentProfileStore.guardians.find((x) => x.id === "guardian-1")).toMatchObject({
      name: "新家長",
      phone: "0911",
    });
  });

  it("rejects stale profile updates without mutation", () => {
    const before = structuredClone(studentProfileStore.profiles);
    const outcome = updateStudentProfile(resolveMockIdentity("teacher"), {
      studentId: "stu-1",
      phone: "0900",
      school: "新學校",
      grade: "國三",
      guardianId: "guardian-1",
      guardianName: "家長",
      guardianPhone: "0911",
      revision: 99,
    });
    expect(outcome.code).toBe("CONFLICT");
    expect(studentProfileStore.profiles).toEqual(before);
  });

  it("validates duplicate and out-of-range result entry", () => {
    const actor = resolveMockIdentity("teacher");
    expect(
      recordAssessmentResult(actor, {
        studentId: "stu-1",
        assessmentId: "exam-m1",
        score: 80,
        comment: "",
      }).code,
    ).toBe("CONFLICT");
    expect(
      recordAssessmentResult(actor, {
        studentId: "stu-2",
        assessmentId: "exam-m2",
        score: 51,
        comment: "",
      }).code,
    ).toBe("VALIDATION_ERROR");
    expect(studentProfileStore.results).toHaveLength(4);
  });

  it("records an accessible result and tracks actor metadata", () => {
    const outcome = recordAssessmentResult(resolveMockIdentity("teacher"), {
      studentId: "stu-2",
      assessmentId: "exam-m2",
      score: 45,
      comment: "進步",
    });
    expect(outcome.ok).toBe(true);
    expect(studentProfileStore.results.at(-1)).toMatchObject({
      studentId: "stu-2",
      assessmentId: "exam-m2",
      score: 45,
      revision: 1,
      updatedBy: "teacher",
    });
  });

  it("corrects in place and rejects stale or cross-scope changes", () => {
    const teacher = resolveMockIdentity("teacher");
    expect(
      correctAssessmentResult(teacher, {
        resultId: "result-1",
        score: 90,
        comment: "已複核",
        revision: 1,
      }).ok,
    ).toBe(true);
    expect(studentProfileStore.results.find((x) => x.id === "result-1")).toMatchObject({
      score: 90,
      comment: "已複核",
      revision: 2,
      updatedBy: "teacher",
    });
    expect(
      correctAssessmentResult(teacher, {
        resultId: "result-1",
        score: 91,
        comment: "",
        revision: 1,
      }).code,
    ).toBe("CONFLICT");
    expect(
      correctAssessmentResult(resolveMockIdentity("assistant"), {
        resultId: "result-4",
        score: 70,
        comment: "",
        revision: 1,
      }).code,
    ).toBe("NOT_FOUND");
  });

  it("keeps read-only users from invoking mutations", () => {
    const viewer = resolveMockIdentity("limited");
    expect(
      recordAssessmentResult(viewer, {
        studentId: "stu-6",
        assessmentId: "exam-m2",
        score: 40,
        comment: "",
      }).code,
    ).toBe("FORBIDDEN");
    expect(
      updateStudentProfile(viewer, {
        studentId: "stu-6",
        phone: "1",
        school: "A",
        grade: "B",
        guardianId: "none",
        guardianName: "C",
        guardianPhone: "2",
        revision: 1,
      }).code,
    ).toBe("FORBIDDEN");
  });
});
