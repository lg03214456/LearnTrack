import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendCompletedProgressAction, saveDailyProgressAction } from "./class-session-actions";
import {
  appendCompletedProgress,
  saveDailyProgress,
} from "@/server/services/class-session-service";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/identity", () => ({
  getAuthorizationContext: vi.fn(async () => ({ profileId: "teacher" })),
}));
vi.mock("@/server/services/class-session-service", () => ({
  appendCompletedProgress: vi.fn(),
  saveDailyProgress: vi.fn(),
  completeClassSession: vi.fn(),
  correctDailyProgress: vi.fn(),
}));

describe("class session actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses client-safe batch input before calling the service", async () => {
    vi.mocked(saveDailyProgress).mockReturnValue({ ok: true, code: "OK", message: "saved" });
    const data = new FormData();
    data.set("classId", "cls-1");
    data.set("sessionId", "session-1");
    data.set("sessionRevision", "2");
    data.set(
      "entries",
      JSON.stringify([
        {
          sessionMemberId: "member-1",
          studentId: "stu-1",
          studyPlanId: "plan-1",
          learningItemId: "item-1",
          learningItemRevision: 3,
          status: "in_progress",
          note: "看到 p.42",
        },
      ]),
    );
    const outcome = await saveDailyProgressAction({ ok: true, code: "OK", message: "" }, data);
    expect(outcome.ok).toBe(true);
    expect(saveDailyProgress).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "teacher" }),
      expect.objectContaining({
        sessionId: "session-1",
        sessionRevision: 2,
        entries: [expect.objectContaining({ note: "看到 p.42", learningItemRevision: 3 })],
      }),
    );
  });

  it("rejects malformed JSON without calling the service", async () => {
    const data = new FormData();
    data.set("entries", "{");
    expect(
      await saveDailyProgressAction({ ok: true, code: "OK", message: "" }, data),
    ).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(saveDailyProgress).not.toHaveBeenCalled();
  });

  it("passes one correction reason with a completed-session progress batch", async () => {
    vi.mocked(appendCompletedProgress).mockReturnValue({
      ok: true,
      code: "OK",
      message: "已補登",
    });
    const data = new FormData();
    data.set("classId", "cls-1");
    data.set("sessionId", "session-1");
    data.set("sessionRevision", "3");
    data.set("reason", "課後補登");
    data.set(
      "entries",
      JSON.stringify([
        {
          sessionMemberId: "member-1",
          studentId: "stu-1",
          studyPlanId: "plan-1",
          learningItemId: "item-1",
          learningItemRevision: 2,
          status: "completed",
        },
      ]),
    );

    await expect(
      appendCompletedProgressAction({ ok: true, code: "OK", message: "" }, data),
    ).resolves.toMatchObject({ ok: true });
    expect(appendCompletedProgress).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "teacher" }),
      expect.objectContaining({ sessionRevision: 3, reason: "課後補登" }),
    );
  });

  it.each([
    ["FORBIDDEN", "沒有操作權限"],
    ["CONFLICT", "資料已被更新"],
  ] as const)("preserves the structured %s service result", async (code, message) => {
    vi.mocked(saveDailyProgress).mockReturnValue({ ok: false, code, message });
    const data = new FormData();
    data.set("classId", "cls-1");
    data.set("sessionId", "session-1");
    data.set("sessionRevision", "2");
    data.set("entries", "[]");

    await expect(
      saveDailyProgressAction({ ok: true, code: "OK", message: "" }, data),
    ).resolves.toEqual({ ok: false, code, message });
  });
});
