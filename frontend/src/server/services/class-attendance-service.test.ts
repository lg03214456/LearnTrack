import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationContext } from "@/features/access-control/access-control.types";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { classSessionStore } from "@/server/data/mock/class-sessions";
import { mockClassSessionRepository } from "@/server/repositories/class-session";
import { saveClassAttendance } from "./class-attendance-service";
vi.mock("@/server/auth/provider-config", () => ({
  authRuntimeConfig: () => ({ domainDataProvider: "mock" }),
}));
const owner = () => resolveMockIdentity("owner");
const command = () => ({
  sessionId: "class-session-1",
  sessionRevision: 1,
  reason: "",
  entries: [
    {
      sessionMemberId: "session-member-1",
      studentId: "stu-1",
      status: "late" as const,
      arrivalTime: "18:42",
    },
  ],
});
beforeEach(() => classSessionStore.reset());
describe("atomic scoped attendance", () => {
  it("persists arrival for the lesson date, authoritative record time, increments session and leaves progress untouched", async () => {
    const progress = structuredClone(classSessionStore.progress);
    expect(await saveClassAttendance(owner(), command())).toMatchObject({ ok: true });
    expect(classSessionStore.attendance[0]).toMatchObject({
      arrivedAt: "2026-08-31T10:42:00.000Z",
      revision: 1,
      recordedBy: owner().profileId,
    });
    expect(Date.parse(classSessionStore.attendance[0].recordedAt)).toBeGreaterThan(
      Date.parse("2026-08-31T10:42:00Z"),
    );
    expect(classSessionStore.sessions[0].revision).toBe(2);
    expect(classSessionStore.progress).toEqual(progress);
    const workspace = mockClassSessionRepository.open(owner(), "cls-1", "2026-08-31")!;
    expect(workspace.members[0].attendance).toMatchObject({
      id: classSessionStore.attendance[0].id,
      arrivedAt: "2026-08-31T10:42:00.000Z",
    });
  });
  it("appends correction, requires reason, checks prior record and preserves original", async () => {
    await saveClassAttendance(owner(), command());
    const original = structuredClone(classSessionStore.attendance[0]);
    const correction = {
      ...command(),
      sessionRevision: 2,
      entries: [{ ...command().entries[0], previousRecordId: original.id, arrivalTime: "18:50" }],
    };
    expect(await saveClassAttendance(owner(), correction)).toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await saveClassAttendance(owner(), { ...correction, reason: "時間更正" })).toMatchObject(
      { ok: true },
    );
    expect(classSessionStore.attendance[0]).toEqual(original);
    expect(classSessionStore.attendance[1]).toMatchObject({
      supersedesId: original.id,
      revision: 2,
      correctionReason: "時間更正",
    });
    expect(
      await saveClassAttendance(owner(), { ...correction, sessionRevision: 3, reason: "重試" }),
    ).toMatchObject({ code: "CONFLICT" });
  });
  it("rolls back the entire batch when any roster relationship is wrong", async () => {
    const before = classSessionStore.snapshot();
    expect(
      await saveClassAttendance(owner(), {
        ...command(),
        entries: [
          ...command().entries,
          {
            ...command().entries[0],
            sessionMemberId: "session-member-2",
            studentId: "foreign-student",
          },
        ],
      }),
    ).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(classSessionStore.snapshot()).toEqual(before);
  });
  it("rejects stale revision, requires completed-session append reason", async () => {
    expect(await saveClassAttendance(owner(), { ...command(), sessionRevision: 2 })).toMatchObject({
      code: "CONFLICT",
    });
    classSessionStore.updateSession({ ...classSessionStore.sessions[0], status: "completed" });
    expect(await saveClassAttendance(owner(), command())).toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await saveClassAttendance(owner(), { ...command(), reason: "課後補登" })).toMatchObject({
      ok: true,
    });
  });
  it.each([
    () => ({ ...owner(), permissions: [] }),
    () => ({ ...owner(), status: "suspended" }),
    () => ({ ...owner(), organizationId: "org-b" }),
    () => ({ ...owner(), scope: { kind: "assigned-classes", classIds: ["other-class"] } }),
    () => ({ ...owner(), actorType: "platform" }),
  ])(
    "rejects unauthorized, inactive, cross-tenant, unassigned and platform contexts %#",
    async (makeActor) => {
      const before = classSessionStore.snapshot();
      expect(
        await saveClassAttendance(makeActor() as AuthorizationContext, command()),
      ).toMatchObject({ ok: false });
      expect(classSessionStore.snapshot()).toEqual(before);
    },
  );
});
