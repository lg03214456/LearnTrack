import { beforeEach, describe, expect, it } from "vitest";
import { appendAuditEvent, executeAuditedMutation } from "@/server/audit/audit-service";
import { mockAuditRepository } from "@/server/audit/mock-audit-repository";
import { resolveMockIdentity } from "@/server/auth/identity-core";
import {
  mockAuthProvider,
  mockAuthStore,
  mockEmailProvider,
  mockMembershipRepository,
  mockPasswordLinkProvider,
  mockSessionProvider,
} from "@/server/auth/mock-providers";
import { accessStore } from "@/server/data/mock/access";
import {
  changeManagedAccountEmail,
  createOwnerManagedAccount,
  setManagedAccountStatus,
} from "./account-administration-service";
import { authenticateAccount } from "./authentication-service";
import { replacePasswordFromLink, requestSelfPasswordChange } from "./password-service";

const providers = {
  auth: mockAuthProvider,
  email: mockEmailProvider,
  memberships: mockMembershipRepository,
  passwordLinks: mockPasswordLinkProvider,
  sessions: mockSessionProvider,
};

describe("Owner-provisioned authentication lifecycle", () => {
  beforeEach(() => {
    accessStore.reset();
    mockAuthStore.reset();
    mockAuditRepository.reset();
  });

  it("provisions, logs in, changes password/email, disables sessions, and reviews audit", async () => {
    const owner = resolveMockIdentity("owner");
    await executeAuditedMutation({
      repository: mockAuditRepository,
      event: {
        actor: owner,
        organizationId: owner.organizationId,
        action: "account.created",
        resourceType: "account",
      },
      mutate: () =>
        createOwnerManagedAccount(
          owner,
          {
            name: "整合測試老師",
            email: "integration@learntrack.test",
            initialPassword: "Integration-Password-2026!",
            roleId: "teacher-role",
            status: "active",
            classIds: ["cls-1"],
          },
          providers,
        ),
    });

    const login = await authenticateAccount(
      { email: "integration@learntrack.test", password: "Integration-Password-2026!" },
      providers,
    );
    expect(login.ok).toBe(true);
    const profile = accessStore.profiles.find(
      (candidate) => candidate.email === "integration@learntrack.test",
    )!;
    const actor = await mockMembershipRepository.resolveByAuthUserId(profile.authUserId!);
    if (actor?.actorType !== "organization") throw new Error("TEST_ORGANIZATION_ACTOR_MISSING");
    expect(actor?.scope).toEqual({ kind: "assigned-classes", classIds: ["cls-1"] });

    await requestSelfPasswordChange(actor!, "http://localhost:3000", providers);
    const link = mockAuthStore.passwordLinks.at(-1)!;
    await expect(
      replacePasswordFromLink(
        { token: link.token, password: "Integration-New-Password-2026!" },
        providers,
      ),
    ).resolves.toMatchObject({ ok: true });
    await appendAuditEvent(mockAuditRepository, {
      actor: actor!,
      organizationId: owner.organizationId,
      action: "password.changed",
      resourceType: "account",
      resourceId: profile.id,
      result: "succeeded",
    });

    const membership = accessStore.memberships.find(
      (candidate) => candidate.profileId === profile.id,
    )!;
    await expect(
      changeManagedAccountEmail(
        owner,
        { membershipId: membership.id, email: "integration-changed@learntrack.test" },
        providers,
      ),
    ).resolves.toMatchObject({ ok: true });
    const activeSession = await mockSessionProvider.create(profile.authUserId!);
    await expect(
      setManagedAccountStatus(
        owner,
        { membershipId: membership.id, status: "inactive" },
        providers,
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(await mockSessionProvider.find(activeSession.id)).toBeNull();

    const audit = await mockAuditRepository.list({
      organizationId: owner.organizationId,
      page: 1,
      pageSize: 20,
    });
    expect(audit.rows.map((event) => event.action)).toEqual(
      expect.arrayContaining(["account.created", "password.changed"]),
    );
  });
});
