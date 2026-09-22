import { beforeEach, describe, expect, it } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classManagementStore } from "@/server/data/mock/class-management";
import { classSessionStore } from "@/server/data/mock/class-sessions";
import { curriculumStore } from "@/server/data/mock/curriculum";
import {
  appendCompletedProgress,
  completeClassSession,
  correctDailyProgress,
  saveDailyProgress,
} from "./class-session-service";

const command = () => {
  const item = curriculumStore.learningItems.find(
    (candidate) => candidate.planId === "plan-1" && candidate.status === "in_progress",
  )!;
  return {
    sessionId: "class-session-1",
    sessionRevision: 1,
    entries: [
      {
        sessionMemberId: "session-member-1",
        studentId: "stu-1",
        studyPlanId: "plan-1",
        learningItemId: item.id,
        learningItemRevision: item.revision,
        status: "completed" as const,
        note: "看到 p.42",
      },
    ],
  };
};

describe("class session service", () => {
  beforeEach(() => {
    classManagementStore.reset();
    classSessionStore.reset();
    curriculumStore.reset();
  });

  it("appends history and updates current learning state together", () => {
    const input = command();
    expect(saveDailyProgress(resolveMockIdentity("teacher"), input).ok).toBe(true);
    expect(classSessionStore.progress).toHaveLength(1);
    expect(
      curriculumStore.learningItems.find((item) => item.id === input.entries[0].learningItemId),
    ).toMatchObject({ status: "completed", note: "看到 p.42", revision: 2 });
  });

  it("rejects one invalid relationship without partial writes", () => {
    const before = structuredClone(curriculumStore.learningItems);
    const input = command();
    input.entries.push({ ...input.entries[0], studentId: "stu-2" });
    expect(saveDailyProgress(resolveMockIdentity("teacher"), input).ok).toBe(false);
    expect(classSessionStore.progress).toHaveLength(0);
    expect(curriculumStore.learningItems).toEqual(before);
  });

  it("rejects unassigned class writes", () => {
    classSessionStore.updateSession({ ...classSessionStore.sessions[0], classId: "cls-2" });
    expect(saveDailyProgress(resolveMockIdentity("teacher"), command()).code).toBe("FORBIDDEN");
  });

  it("preserves the original when correcting a completed session entry", () => {
    const input = command();
    expect(saveDailyProgress(resolveMockIdentity("owner"), input).ok).toBe(true);
    expect(completeClassSession(resolveMockIdentity("owner"), "class-session-1", 2).ok).toBe(true);
    const original = classSessionStore.progress[0];
    expect(
      correctDailyProgress(resolveMockIdentity("owner"), {
        progressId: original.id,
        revision: original.revision,
        status: "in_progress",
        note: "需再練習",
        reason: "老師更正",
      }).ok,
    ).toBe(true);
    expect(classSessionStore.progress).toHaveLength(2);
    expect(classSessionStore.progress[1]).toMatchObject({
      supersedesId: original.id,
      correctionReason: "老師更正",
    });
  });

  it("batch-adds progress to a completed session with one required reason", () => {
    expect(completeClassSession(resolveMockIdentity("owner"), "class-session-1", 1).ok).toBe(true);
    const input = command();
    expect(
      appendCompletedProgress(resolveMockIdentity("owner"), {
        ...input,
        sessionRevision: 2,
        reason: "課後補登",
      }).ok,
    ).toBe(true);
    expect(classSessionStore.progress).toHaveLength(1);
    expect(classSessionStore.progress[0]).toMatchObject({ correctionReason: "課後補登" });
  });

  it("does not append completed-session progress without a reason", () => {
    expect(completeClassSession(resolveMockIdentity("owner"), "class-session-1", 1).ok).toBe(true);
    expect(
      appendCompletedProgress(resolveMockIdentity("owner"), {
        ...command(),
        sessionRevision: 2,
        reason: "",
      }).code,
    ).toBe("VALIDATION_ERROR");
    expect(classSessionStore.progress).toHaveLength(0);
  });
});
