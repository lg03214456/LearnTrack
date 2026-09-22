import { beforeEach, describe, expect, it } from "vitest";
import { defineAuthProviderContract } from "../../../test/auth-provider-contract";
import {
  mockAuthProvider,
  mockAuthStore,
  mockEmailProvider,
  mockMembershipRepository,
  mockSessionProvider,
} from "./mock-providers";

defineAuthProviderContract("Mock", () => ({
  auth: mockAuthProvider,
  email: mockEmailProvider,
  sessions: mockSessionProvider,
  credential: {
    authUserId: "mock-auth-owner",
    email: "owner@learntrack.test",
    password: "Demo-Owner-2026!",
  },
  reset: () => mockAuthStore.reset(),
  sentPasswordLinkCount: () => mockAuthStore.emails.length,
}));

describe("Mock authentication providers", () => {
  beforeEach(() => mockAuthStore.reset());

  it("accepts valid seeded credentials and resolves membership", async () => {
    const result = await mockAuthProvider.authenticate("owner@learntrack.test", "Demo-Owner-2026!");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      await mockMembershipRepository.resolveByAuthUserId(result.value.authUserId),
    ).toMatchObject({ profileId: "owner", roleName: "Owner" });
  });

  it("returns the same safe failure for unknown email and wrong password", async () => {
    await expect(mockAuthProvider.authenticate("missing@example.test", "wrong")).resolves.toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
    });
    await expect(mockAuthProvider.authenticate("owner@learntrack.test", "wrong")).resolves.toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("rejects a disabled account", async () => {
    await expect(
      mockAuthProvider.authenticate("inactive@learntrack.test", "Demo-Inactive-2026!"),
    ).resolves.toEqual({ ok: false, code: "ACCOUNT_DISABLED" });
  });

  it("invalidates logout and revoked sessions", async () => {
    const first = await mockSessionProvider.create("mock-auth-owner");
    const second = await mockSessionProvider.create("mock-auth-owner");
    await mockSessionProvider.revoke(first.id);
    expect(await mockSessionProvider.find(first.id)).toBeNull();
    expect(await mockSessionProvider.find(second.id)).not.toBeNull();

    await mockSessionProvider.revokeAll("mock-auth-owner");
    expect(await mockSessionProvider.find(second.id)).toBeNull();
  });
});
