import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { SupabaseClassSessionRepository } from "./class-session-supabase";

const workspace = {
  session: { id: "lesson-a", classId: "cls-1", sessionDate: "2026-10-10" },
  members: [],
  history: [],
  canManage: true,
  attendanceAvailable: true,
  canManageAttendance: true,
};
function setup(data: unknown = workspace, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  const factory = vi.fn(async () => ({ rpc }) as unknown as SupabaseClient);
  return { rpc, factory, repository: new SupabaseClassSessionRepository(factory) };
}

describe("Supabase daily classroom adapter", () => {
  it("passes the organization/class/date to a user-session RPC and preserves empty data", async () => {
    const { repository, rpc } = setup();
    const actor = resolveMockIdentity("owner");
    expect(await repository.open(actor, "cls-1", "2026-10-10")).toEqual(workspace);
    expect(rpc).toHaveBeenCalledWith("open_class_daily_workspace_v2", {
      target_organization_id: actor.organizationId,
      target_class_id: "cls-1",
      target_date: "2026-10-10",
    });
  });
  it("keeps real progress readable but explicitly disables attendance when its migration is missing", async () => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    expect(
      await repository.open(resolveMockIdentity("owner"), "cls-1", "2026-10-10"),
    ).toMatchObject({ attendanceAvailable: false, canManageAttendance: false });
    expect(rpc).toHaveBeenLastCalledWith("open_class_daily_workspace", expect.any(Object));
  });
  it("does not connect outside a teacher's class scope", async () => {
    const { repository, factory } = setup();
    expect(
      await repository.open(resolveMockIdentity("teacher"), "cls-2", "2026-10-10"),
    ).toBeUndefined();
    expect(factory).not.toHaveBeenCalled();
  });
  it("returns no workspace for a missing class instead of mock data", async () => {
    const { repository } = setup(null);
    expect(
      await repository.open(resolveMockIdentity("owner"), "cls-1", "2026-10-10"),
    ).toBeUndefined();
  });
  it("rejects a mismatched RPC projection", async () => {
    const { repository } = setup({
      ...workspace,
      session: { ...workspace.session, classId: "other" },
    });
    await expect(
      repository.open(resolveMockIdentity("owner"), "cls-1", "2026-10-10"),
    ).rejects.toMatchObject({ code: "PERSISTENCE_UNAVAILABLE" });
  });
  it("maps database denial rather than using mock results", async () => {
    const { repository } = setup(null, { code: "42501" });
    await expect(
      repository.open(resolveMockIdentity("owner"), "cls-1", "2026-10-10"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it.each(["save", "append", "complete", "correct"] as const)(
    "uses the same tenant transaction boundary for %s",
    async (operation) => {
      const { repository, rpc } = setup();
      const actor = resolveMockIdentity("owner");
      const command = { sessionId: "lesson-a", sessionRevision: 1, entries: [] };
      await repository.mutate(actor, operation, command);
      expect(rpc).toHaveBeenCalledWith("mutate_class_daily_progress", {
        target_organization_id: actor.organizationId,
        operation,
        command,
      });
    },
  );
  it("rejects a read-only actor before connecting", async () => {
    const { repository, factory } = setup();
    const actor = { ...resolveMockIdentity("owner"), permissions: [] };
    await expect(repository.mutate(actor, "save", {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(factory).not.toHaveBeenCalled();
  });
  it.each([
    ["40001", "CONFLICT"],
    ["23514", "INVALID_RELATIONSHIP"],
    ["22P02", "INVALID_RELATIONSHIP"],
    ["PGRST202", "PERSISTENCE_UNAVAILABLE"],
  ])("maps %s to %s", async (code, expected) => {
    const { repository } = setup(null, { code });
    await expect(repository.mutate(resolveMockIdentity("owner"), "save", {})).rejects.toMatchObject(
      { code: expected },
    );
  });
});
