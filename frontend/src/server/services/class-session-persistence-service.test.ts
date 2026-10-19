import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import { authRuntimeConfig } from "@/server/auth/provider-config";
import { supabaseClassSessionRepository } from "@/server/repositories/class-session-supabase";
import { RepositoryError } from "@/server/repositories/repository-error";
import * as mock from "./class-session-service";
import { saveDailyProgress, completeClassSession } from "./class-session-persistence-service";

vi.mock("@/server/auth/provider-config", () => ({ authRuntimeConfig: vi.fn() }));
vi.mock("@/server/repositories/class-session-supabase", () => ({
  supabaseClassSessionRepository: { mutate: vi.fn() },
}));
vi.mock("./class-session-service", () => ({ saveDailyProgress: vi.fn() }));

describe("daily classroom persistence service", () => {
  const actor = resolveMockIdentity("owner");
  const command = { sessionId: "lesson-a", sessionRevision: 1, entries: [] };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authRuntimeConfig).mockReturnValue({ domainDataProvider: "supabase" } as never);
  });
  it("writes to Supabase without touching the mock store", async () => {
    expect(await saveDailyProgress(actor, command)).toMatchObject({ ok: true });
    expect(supabaseClassSessionRepository.mutate).toHaveBeenCalledWith(actor, "save", command);
    expect(mock.saveDailyProgress).not.toHaveBeenCalled();
  });
  it("passes the expected revision when completing a session", async () => {
    expect(await completeClassSession(actor, "lesson-a", 3)).toMatchObject({ ok: true });
    expect(supabaseClassSessionRepository.mutate).toHaveBeenCalledWith(actor, "complete", {
      sessionId: "lesson-a",
      sessionRevision: 3,
    });
  });
  it.each(["CONFLICT", "FORBIDDEN", "NOT_FOUND", "INVALID_RELATIONSHIP"] as const)(
    "returns a safe result for %s",
    async (code) => {
      vi.mocked(supabaseClassSessionRepository.mutate).mockRejectedValue(new RepositoryError(code));
      expect(await saveDailyProgress(actor, command)).toMatchObject({
        ok: false,
        code: code === "INVALID_RELATIONSHIP" ? "VALIDATION_ERROR" : code,
      });
      expect(mock.saveDailyProgress).not.toHaveBeenCalled();
    },
  );
  it("fails closed when a migration or connection is missing", async () => {
    vi.mocked(supabaseClassSessionRepository.mutate).mockRejectedValue(
      new RepositoryError("PERSISTENCE_UNAVAILABLE"),
    );
    await expect(saveDailyProgress(actor, command)).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
    });
    expect(mock.saveDailyProgress).not.toHaveBeenCalled();
  });
  it("retains the explicit development mock provider", async () => {
    vi.mocked(authRuntimeConfig).mockReturnValue({ domainDataProvider: "mock" } as never);
    vi.mocked(mock.saveDailyProgress).mockReturnValue({ ok: true, code: "OK", message: "ok" });
    expect(await saveDailyProgress(actor, command)).toMatchObject({ ok: true });
    expect(supabaseClassSessionRepository.mutate).not.toHaveBeenCalled();
  });
});
