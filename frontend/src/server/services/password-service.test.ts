import { beforeEach, describe, expect, it } from "vitest";
import {
  mockAuthProvider,
  mockAuthStore,
  mockEmailProvider,
  mockMembershipRepository,
  mockPasswordLinkProvider,
  mockSessionProvider,
} from "@/server/auth/mock-providers";
import {
  replacePasswordFromLink,
  requestPasswordRecovery,
  requestSelfPasswordChange,
  validatePasswordLink,
} from "./password-service";

const providers = {
  auth: mockAuthProvider,
  email: mockEmailProvider,
  memberships: mockMembershipRepository,
  passwordLinks: mockPasswordLinkProvider,
  sessions: mockSessionProvider,
};

describe("password recovery", () => {
  beforeEach(() => mockAuthStore.reset());

  it("returns identical confirmation for known and unknown email", async () => {
    const known = await requestPasswordRecovery(
      "owner@learntrack.test",
      "http://localhost:3000",
      providers,
    );
    const unknown = await requestPasswordRecovery(
      "unknown@learntrack.test",
      "http://localhost:3000",
      providers,
    );
    expect(known).toEqual(unknown);
    expect(mockAuthStore.emails).toHaveLength(1);
  });

  it("sends one account-bound self-change link", async () => {
    const actor = await mockMembershipRepository.resolveByAuthUserId("mock-auth-owner");
    if (actor?.actorType !== "organization") throw new Error("TEST_ACTOR_MISSING");
    await expect(
      requestSelfPasswordChange(actor, "http://localhost:3000", providers),
    ).resolves.toMatchObject({ ok: true });
    expect(mockAuthStore.emails).toHaveLength(1);
    expect(mockAuthStore.emails[0]).toMatchObject({
      recipient: "owner@learntrack.test",
      link: { authUserId: "mock-auth-owner", purpose: "change" },
    });
  });

  it("accepts one valid link once, replaces the password, and revokes sessions", async () => {
    const session = await mockSessionProvider.create("mock-auth-owner");
    const link = await mockPasswordLinkProvider.create("mock-auth-owner", "recovery");
    expect(await validatePasswordLink(link.token, providers)).toBe(true);
    await expect(
      replacePasswordFromLink(
        { token: link.token, password: "New-Demo-Password-2026!" },
        providers,
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(await mockSessionProvider.find(session.id)).toBeNull();
    expect(await validatePasswordLink(link.token, providers)).toBe(false);
    await expect(
      mockAuthProvider.authenticate("owner@learntrack.test", "New-Demo-Password-2026!"),
    ).resolves.toMatchObject({ ok: true });
  });

  it.each(["altered-token", "expired", "consumed", "disabled"])(
    "rejects %s links safely",
    async (kind) => {
      const authUserId = kind === "disabled" ? "mock-auth-inactive" : "mock-auth-owner";
      const link = await mockPasswordLinkProvider.create(authUserId, "recovery");
      if (kind === "expired") {
        mockAuthStore.passwordLinks[0].expiresAt = "2020-01-01T00:00:00.000Z";
      }
      if (kind === "consumed") await mockPasswordLinkProvider.consume(link.token);
      const token = kind === "altered-token" ? `${link.token}-changed` : link.token;
      await expect(
        replacePasswordFromLink({ token, password: "New-Demo-Password-2026!" }, providers),
      ).resolves.toMatchObject({ ok: false, code: "LINK_INVALID" });
    },
  );
});
