import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { SupabaseClassAttendanceRepository } from "./class-attendance";
const command = {
  sessionId: "session",
  sessionRevision: 1,
  reason: "",
  entries: [{ sessionMemberId: "member", studentId: "student", status: "present" as const }],
};
function setup(error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ error });
  const factory = vi.fn(async () => ({ rpc }) as unknown as SupabaseClient);
  return { rpc, factory, repository: new SupabaseClassAttendanceRepository(factory) };
}
describe("Supabase attendance adapter", () => {
  it("passes only server-resolved tenant and command to the user-JWT RPC", async () => {
    const { repository, rpc } = setup();
    const actor = resolveMockIdentity("owner");
    await repository.save(actor, command);
    expect(rpc).toHaveBeenCalledWith("save_class_daily_attendance", {
      target_organization_id: actor.organizationId,
      command,
    });
  });
  it("does not connect without separate attendance permissions", async () => {
    const { repository, factory } = setup();
    await expect(
      repository.save(
        { ...resolveMockIdentity("owner"), permissions: ["progress.manage"] },
        command,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(factory).not.toHaveBeenCalled();
  });
  it.each([
    ["42501", "FORBIDDEN"],
    ["40001", "CONFLICT"],
    ["23514", "INVALID_RELATIONSHIP"],
    ["22P02", "INVALID_RELATIONSHIP"],
    ["PGRST202", "PERSISTENCE_UNAVAILABLE"],
  ])("maps %s without mock fallback", async (code, expected) => {
    await expect(
      setup({ code }).repository.save(resolveMockIdentity("owner"), command),
    ).rejects.toMatchObject({ code: expected });
  });
});
