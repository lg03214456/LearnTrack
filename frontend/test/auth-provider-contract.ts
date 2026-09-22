import { beforeEach, describe, expect, it } from "vitest";
import type {
  AuthProvider,
  EmailProvider,
  PasswordLink,
  SessionProvider,
} from "@/server/auth/contracts";

export interface AuthProviderContractHarness {
  auth: AuthProvider;
  email: EmailProvider;
  sessions: SessionProvider;
  credential: { authUserId: string; email: string; password: string };
  reset(): void | Promise<void>;
  sentPasswordLinkCount(): number;
}

export function defineAuthProviderContract(
  name: string,
  createHarness: () => AuthProviderContractHarness,
) {
  describe(`${name} provider contract`, () => {
    const harness = createHarness();

    beforeEach(async () => harness.reset());

    it("authenticates valid credentials and safely rejects invalid credentials", async () => {
      const valid = await harness.auth.authenticate(
        harness.credential.email,
        harness.credential.password,
      );
      expect(valid).toMatchObject({
        ok: true,
        value: { authUserId: harness.credential.authUserId },
      });
      await expect(
        harness.auth.authenticate(harness.credential.email, "incorrect-password"),
      ).resolves.toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    });

    it("sends password links through the configured email provider", async () => {
      const link: PasswordLink = {
        token: "contract-token",
        authUserId: harness.credential.authUserId,
        purpose: "recovery",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      };
      await expect(
        harness.email.sendPasswordLink({
          recipient: harness.credential.email,
          link,
          callbackUrl: "http://localhost:3000/password/reset?token=contract-token",
        }),
      ).resolves.toEqual({ ok: true });
      expect(harness.sentPasswordLinkCount()).toBe(1);
    });

    it("replaces a password", async () => {
      await expect(
        harness.auth.replacePassword(harness.credential.authUserId, "Replacement-Password-2026!"),
      ).resolves.toEqual({ ok: true, value: true });
      await expect(
        harness.auth.authenticate(harness.credential.email, "Replacement-Password-2026!"),
      ).resolves.toMatchObject({ ok: true });
    });

    it("invalidates logout and revoked sessions", async () => {
      const firstLogin = await harness.auth.authenticate(
        harness.credential.email,
        harness.credential.password,
      );
      expect(firstLogin.ok).toBe(true);
      if (!firstLogin.ok) return;
      const first = await harness.sessions.create(
        firstLogin.value.authUserId,
        firstLogin.value.session,
      );
      const secondLogin = await harness.auth.authenticate(
        harness.credential.email,
        harness.credential.password,
      );
      expect(secondLogin.ok).toBe(true);
      if (!secondLogin.ok) return;
      const second = await harness.sessions.create(
        secondLogin.value.authUserId,
        secondLogin.value.session,
      );

      await harness.sessions.revoke(first.id);
      expect(await harness.sessions.find(first.id)).toBeNull();
      expect(await harness.sessions.find(second.id)).not.toBeNull();

      await harness.sessions.revokeAll(harness.credential.authUserId);
      expect(await harness.sessions.find(second.id)).toBeNull();
    });
  });
}
