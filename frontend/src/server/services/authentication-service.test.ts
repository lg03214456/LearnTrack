import { beforeEach, describe, expect, it } from "vitest";
import {
  mockAuthProvider,
  mockAuthStore,
  mockMembershipRepository,
  mockSessionProvider,
} from "@/server/auth/mock-providers";
import { authenticateAccount } from "./authentication-service";

const providers = {
  auth: mockAuthProvider,
  memberships: mockMembershipRepository,
  sessions: mockSessionProvider,
};

describe("authenticateAccount", () => {
  beforeEach(() => mockAuthStore.reset());

  it("creates a usable session for an active account", async () => {
    const result = await authenticateAccount(
      { email: "owner@learntrack.test", password: "Demo-Owner-2026!" },
      providers,
    );
    expect(result).toMatchObject({ ok: true, code: "OK", redirectTo: "/students" });
    expect(await mockSessionProvider.find(result.sessionId!)).not.toBeNull();
  });

  it.each([
    ["owner@learntrack.test", "wrong", "INVALID_CREDENTIALS"],
    ["inactive@learntrack.test", "Demo-Inactive-2026!", "ACCOUNT_DISABLED"],
  ])(
    "denies invalid or disabled credentials without creating a session",
    async (email, password, code) => {
      const result = await authenticateAccount({ email, password }, providers);
      expect(result).toMatchObject({ ok: false, code });
      expect(mockAuthStore.sessions).toHaveLength(0);
    },
  );
});
