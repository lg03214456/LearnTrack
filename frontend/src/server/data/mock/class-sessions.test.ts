import { beforeEach, describe, expect, it } from "vitest";
import { classSessionStore } from "./class-sessions";

describe("class session mock store", () => {
  beforeEach(() => classSessionStore.reset());

  it("restores deterministic session, roster, and progress state", () => {
    const baseline = classSessionStore.snapshot();
    classSessionStore.appendProgress([
      {
        id: "temporary",
        organizationId: "org-001",
        classSessionId: "class-session-1",
        sessionMemberId: "session-member-1",
        studentId: "stu-1",
        studyPlanId: "plan-1",
        learningItemId: "plan-1-m1-ch-0",
        statusAfterSession: "completed",
        recordedBy: "owner",
        recordedAt: "2026-08-31T12:00:00Z",
        revision: 1,
      },
    ]);
    expect(classSessionStore.progress).toHaveLength(1);
    classSessionStore.reset();
    expect(classSessionStore.snapshot()).toEqual(baseline);
  });
});
