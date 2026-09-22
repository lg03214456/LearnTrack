import { beforeEach, describe, expect, it } from "vitest";
import { mockAuthStore, mockMembershipRepository, mockSessionProvider } from "./mock-providers";
import { resolveSessionIdentity } from "./identity-core";

describe("session identity resolution", () => {
  beforeEach(() => mockAuthStore.reset());

  it("fails closed without a session instead of returning Owner", async () => {
    await expect(
      resolveSessionIdentity(undefined, {
        sessions: mockSessionProvider,
        memberships: mockMembershipRepository,
      }),
    ).resolves.toBeNull();
  });

  it("preserves AuthorizationContext after resolving an authenticated session", async () => {
    const session = await mockSessionProvider.create("mock-auth-owner");
    await expect(
      resolveSessionIdentity(session.id, {
        sessions: mockSessionProvider,
        memberships: mockMembershipRepository,
      }),
    ).resolves.toMatchObject({ profileId: "owner", roleId: "owner-role" });
  });
});
